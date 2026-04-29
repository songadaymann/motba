import * as fs from "fs";
import * as path from "path";

const ENV_FILES = [".env.local", ".env"];

export function loadLocalEnv() {
  for (const relativePath of ENV_FILES) {
    const envPath = path.resolve(process.cwd(), relativePath);
    if (!fs.existsSync(envPath)) continue;

    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split(/\r?\n/)) {
      const match = line.match(/^([^=#]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}
