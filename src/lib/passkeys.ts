import "server-only";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type Base64URLString,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import type { User } from "@/types/database";
import {
  addMinutes,
  all,
  first,
  fromSqlBoolean,
  nowIso,
  run,
  toSqlBoolean,
} from "@/lib/d1-utils";
import { base64UrlDecode, base64UrlEncode } from "@/lib/auth";

const RP_NAME = "MOTBA";
const CHALLENGE_MINUTES = 10;

type RpContext = {
  rpID: string;
  origin: string;
};

type PasskeyRow = {
  id: string;
  user_id: string;
  credential_id: string;
  webauthn_user_id: string;
  public_key: string;
  counter: number;
  device_type: string | null;
  backed_up: number | boolean;
  transports: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
};

type WebAuthnChallengeRow = {
  id: string;
  user_id: string | null;
  purpose: "registration" | "authentication";
  challenge: string;
  rp_id: string;
  origin: string;
  expires_at: string;
  consumed_at: string | null;
};

export type UserPasskey = {
  id: string;
  credentialId: Base64URLString;
  userId: string;
  name: string | null;
  transports: AuthenticatorTransportFuture[];
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
};

function getRpContext(request: Request): RpContext {
  const url = new URL(request.url);
  return {
    rpID: url.hostname,
    origin: url.origin,
  };
}

function parseTransports(value: string): AuthenticatorTransportFuture[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? (parsed.filter((item) => typeof item === "string") as AuthenticatorTransportFuture[])
      : [];
  } catch {
    return [];
  }
}

function mapPasskey(row: PasskeyRow): UserPasskey {
  return {
    id: row.id,
    credentialId: row.credential_id,
    userId: row.user_id,
    name: row.name,
    transports: parseTransports(row.transports),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    backedUp: fromSqlBoolean(row.backed_up),
  };
}

function toCredential(row: PasskeyRow): WebAuthnCredential {
  return {
    id: row.credential_id,
    publicKey: base64UrlDecode(row.public_key),
    counter: row.counter,
    transports: parseTransports(row.transports),
  };
}

async function saveChallenge(input: {
  userId?: string | null;
  purpose: "registration" | "authentication";
  challenge: string;
  rpID: string;
  origin: string;
}) {
  await run(
    `INSERT INTO webauthn_challenges (
       id,
       user_id,
       purpose,
       challenge,
       rp_id,
       origin,
       expires_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.userId ?? null,
      input.purpose,
      input.challenge,
      input.rpID,
      input.origin,
      addMinutes(CHALLENGE_MINUTES),
    ]
  );
}

async function consumeChallenge(input: {
  challenge: string;
  purpose: "registration" | "authentication";
  userId?: string | null;
}): Promise<WebAuthnChallengeRow | null> {
  const row = await first<WebAuthnChallengeRow>(
    `SELECT *
     FROM webauthn_challenges
     WHERE challenge = ?
       AND purpose = ?
       AND consumed_at IS NULL
       AND expires_at > ?
       ${input.userId ? "AND user_id = ?" : ""}
     LIMIT 1`,
    input.userId
      ? [input.challenge, input.purpose, nowIso(), input.userId]
      : [input.challenge, input.purpose, nowIso()]
  );

  if (!row) return null;
  await run("UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ?", [
    nowIso(),
    row.id,
  ]);
  return row;
}

export async function listPasskeysForUser(userId: string): Promise<UserPasskey[]> {
  const rows = await all<PasskeyRow>(
    `SELECT *
     FROM user_passkeys
     WHERE user_id = ?
     ORDER BY created_at ASC`,
    [userId]
  );
  return rows.map(mapPasskey);
}

export async function deletePasskeyForUser(input: { id: string; userId: string }) {
  await run("DELETE FROM user_passkeys WHERE id = ? AND user_id = ?", [
    input.id,
    input.userId,
  ]);
  return listPasskeysForUser(input.userId);
}

export async function createPasskeyRegistrationOptions(
  user: User,
  request: Request
) {
  const rp = getRpContext(request);
  const existingPasskeys = await listPasskeysForUser(user.id);
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rp.rpID,
    userName: user.email,
    userID: new TextEncoder().encode(user.id),
    userDisplayName: user.name || user.email,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  await saveChallenge({
    userId: user.id,
    purpose: "registration",
    challenge: options.challenge,
    rpID: rp.rpID,
    origin: rp.origin,
  });

  return options;
}

export async function verifyPasskeyRegistration(input: {
  user: User;
  credential: RegistrationResponseJSON;
  challenge: string;
  name?: string | null;
}) {
  const challenge = await consumeChallenge({
    challenge: input.challenge,
    purpose: "registration",
    userId: input.user.id,
  });

  if (!challenge) {
    throw new Error("Passkey registration challenge expired");
  }

  const verification = await verifyRegistrationResponse({
    response: input.credential,
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rp_id,
  });

  if (!verification.verified) {
    throw new Error("Passkey registration could not be verified");
  }

  const { credential, credentialBackedUp, credentialDeviceType } =
    verification.registrationInfo;

  await run(
    `INSERT INTO user_passkeys (
       id,
       user_id,
       credential_id,
       webauthn_user_id,
       public_key,
       counter,
       device_type,
       backed_up,
       transports,
       name
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      input.user.id,
      credential.id,
      base64UrlEncode(new TextEncoder().encode(input.user.id)),
      base64UrlEncode(credential.publicKey),
      credential.counter,
      credentialDeviceType,
      toSqlBoolean(credentialBackedUp),
      JSON.stringify(credential.transports ?? []),
      input.name?.trim() || null,
    ]
  );

  return listPasskeysForUser(input.user.id);
}

export async function createPasskeyAuthenticationOptions(request: Request) {
  const rp = getRpContext(request);
  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    allowCredentials: [],
    userVerification: "preferred",
  });

  await saveChallenge({
    purpose: "authentication",
    challenge: options.challenge,
    rpID: rp.rpID,
    origin: rp.origin,
  });

  return options;
}

export async function verifyPasskeyAuthentication(input: {
  credential: AuthenticationResponseJSON;
  challenge: string;
}): Promise<User> {
  const passkey = await first<PasskeyRow>(
    "SELECT * FROM user_passkeys WHERE credential_id = ?",
    [input.credential.id]
  );

  if (!passkey) {
    throw new Error("Passkey not recognized");
  }

  const challenge = await consumeChallenge({
    challenge: input.challenge,
    purpose: "authentication",
  });

  if (!challenge) {
    throw new Error("Passkey sign-in challenge expired");
  }

  const verification = await verifyAuthenticationResponse({
    response: input.credential,
    expectedChallenge: challenge.challenge,
    expectedOrigin: challenge.origin,
    expectedRPID: challenge.rp_id,
    credential: toCredential(passkey),
  });

  if (!verification.verified) {
    throw new Error("Passkey sign-in could not be verified");
  }

  await run(
    `UPDATE user_passkeys
     SET counter = ?,
         last_used_at = ?
     WHERE id = ?`,
    [verification.authenticationInfo.newCounter, nowIso(), passkey.id]
  );

  const user = await first<User>("SELECT * FROM users WHERE id = ?", [
    passkey.user_id,
  ]);
  if (!user) throw new Error("Passkey user not found");
  return user;
}
