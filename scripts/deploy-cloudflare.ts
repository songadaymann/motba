import { spawnSync } from "child_process";
import { loadLocalEnv } from "./lib/load-env";

loadLocalEnv();

const args = process.argv.slice(2);

function getArg(flag: string) {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
}

function hasFlag(flag: string) {
  return args.includes(flag);
}

const envName = getArg("--env");
const skipBuild = hasFlag("--skip-build");

const commandEnv = {
  ...process.env,
};

// Prefer an explicitly provided deploy-capable API token. Otherwise Wrangler
// uses the logged-in OAuth session from the local machine.
if (process.env.CLOUDFLARE_API_TOKEN) {
  commandEnv.CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
} else {
  delete commandEnv.CLOUDFLARE_API_TOKEN;
}

function runCommand(commandArgs: string[], options?: { input?: string }) {
  const result = spawnSync("npx", commandArgs, {
    cwd: process.cwd(),
    env: commandEnv,
    stdio: options?.input ? ["pipe", "inherit", "inherit"] : "inherit",
    input: options?.input,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!skipBuild) {
  runCommand(["opennextjs-cloudflare", "build"]);
}

const deployArgs = ["opennextjs-cloudflare", "deploy"];
if (envName) {
  deployArgs.push("--env", envName);
} else {
  // Explicitly target the top-level environment to avoid Wrangler ambiguity.
  deployArgs.push("--env", "");
}

runCommand(deployArgs);

const secrets = [
  ["CLOUDINARY_API_KEY", process.env.CLOUDINARY_API_KEY],
  ["CLOUDINARY_API_SECRET", process.env.CLOUDINARY_API_SECRET],
  ["RESEND_API_KEY", process.env.RESEND_API_KEY],
] as const;

for (const [name, value] of secrets) {
  if (!value) continue;

  const secretArgs = ["wrangler", "secret", "put", name];
  if (envName) {
    secretArgs.push("--env", envName);
  } else {
    secretArgs.push("--env", "");
  }

  runCommand(secretArgs, { input: `${value}\n` });
}

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY is not set. Email sign-in links will not be sent from production.");
}
