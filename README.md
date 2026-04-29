## MOTBA Web

This app targets Cloudflare Workers via OpenNext and uses Cloudflare D1 for runtime data. Admin access uses MOTBA sign-in sessions plus the `ADMIN_EMAILS` allowlist; Cloudflare Access can still be configured as an optional extra layer.

## Local Dev

Run the app locally:

```bash
npm run dev
```

For local admin access without signing in, set `ALLOW_LOCAL_ADMIN=true` in `.dev.vars` or your local env.

## Cloudflare Setup

The Worker config lives in [`wrangler.jsonc`](/Users/jonathanmann/SongADAO Dropbox/Jonathan Mann/projects/MOTBA/web/wrangler.jsonc).

Required bindings and vars:

- `DB`: D1 database binding
- `MOTBA_BUCKET`: R2 bucket binding for the existing `motba` bucket
- `ACCESS_AUD`: optional Cloudflare Access application audience
- `ACCESS_TEAM_DOMAIN`: optional Cloudflare Access team domain or issuer
- `ADMIN_EMAILS`: comma-separated allowlist
- `ALLOW_LOCAL_ADMIN`: `true` for local-only bypass
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: public Cloudinary cloud name
- `NEXT_PUBLIC_R2_PUBLIC_URL`: public R2 base URL
- `RESEND_API_KEY`: secret used for public sign-in and submission verification email
- `RESEND_FROM_EMAIL`: public sender string, for example `MOTBA <noreply@motba.art>`

`ASSETS` is reserved by OpenNext for static assets, so the existing R2 content bucket is bound as `MOTBA_BUCKET`.

Recommended Cloudflare token scopes for this repo:

- Workers Scripts: Edit
- Workers Routes or Custom Domains: Edit if you attach a domain
- D1: Edit
- R2: Read or Edit if you manage buckets through Wrangler
- Access: Edit only if you want to create or update an optional Cloudflare Access application by API

## Public Identity

Public identity and admin auth share the MOTBA sign-in session.

- Submissions do not require an account up front. The submitter gets an email verification link before the submission is treated as verified.
- Email verification creates or reuses a `users` row and links the submission to that user.
- Profile claims are represented by `artist_memberships`, so a person account can later be connected to an artist as `owner`, `representative`, or `contributor`.
- Admins and public users first sign in by email, then add passkeys from `/account`; returning users can sign in from `/sign-in` with a passkey.

For Resend, verify a sending domain in Resend and Cloudflare DNS, then set `RESEND_API_KEY` as a Cloudflare secret. The deploy helper syncs `RESEND_API_KEY` from local env when present:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_API_KEY --env preview
```

Passkeys rely on the request hostname as the WebAuthn relying party ID. Localhost works for local testing; production passkeys created on `motba.art` will be scoped to `motba.art`.

## Database Commands

Apply D1 migrations locally:

```bash
npm run db:migrate:local
```

Apply D1 migrations remotely after the real D1 IDs are added to `wrangler.jsonc`:

```bash
npm run db:migrate:preview
npm run db:migrate:prod
```

Export live Supabase data:

```bash
npm run data:export:supabase
```

Generate D1 import SQL:

```bash
npm run data:import:d1
```

Execute the import against local D1:

```bash
npm run data:import:d1 -- --local --execute
```

Execute the import against preview or prod D1:

```bash
npm run data:import:d1 -- --env preview --execute --database motba-db-preview
npm run data:import:d1 -- --execute --database motba
```

Audit expected R2 images after export:

```bash
npm run images:audit:r2
```

## Deploy

Preview locally with the Workers runtime:

```bash
npm run preview
```

Deploy to Cloudflare:

```bash
npm run deploy
```

Deploy the preview environment:

```bash
npm run deploy:preview
```

The deploy helper loads local env, uses an explicitly provided `CLOUDFLARE_API_TOKEN` when present or the local Wrangler OAuth session otherwise, targets the intended Wrangler environment explicitly, and syncs the Cloudinary and Resend secrets after deploy.

## Cutover Checklist

- Create D1 databases `motba` and `motba-db-preview`
- Replace placeholder D1 IDs in [`wrangler.jsonc`](/Users/jonathanmann/SongADAO Dropbox/Jonathan Mann/projects/MOTBA/web/wrangler.jsonc)
- Set `ADMIN_EMAILS`
- Optionally create a Cloudflare Access application protecting `/admin*` and `/api/admin/*`, then set `ACCESS_AUD` and `ACCESS_TEAM_DOMAIN`
- Export live Supabase data
- Apply D1 migrations
- Import the export into D1
- Verify admin CRUD and public catalog pages in Workers preview
- Cut the domain from Vercel to Cloudflare
