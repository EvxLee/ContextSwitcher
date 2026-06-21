import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const envPath = join(root, ".env.local");
const clientPath = join(root, "lib", "debate-client.ts");
const publicPath = join(root, "public");
const envText = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const clientText = existsSync(clientPath) ? readFileSync(clientPath, "utf8") : "";
const nodeMajor = Number(process.versions.node.split(".")[0]);

function hasEnvValue(name: string) {
  const match = envText.match(new RegExp(`^${name}=(.+)$`, "m"));
  return Boolean(match?.[1].trim());
}

function status(ok: boolean) {
  return ok ? "OK" : "MISSING";
}

const usesMockClient = /const\s+impl\s*=\s*mock/.test(clientText);
const demoAudio = existsSync(publicPath)
  ? readdirSync(publicPath).find((file) => /^demo.*\.(mp3|wav|m4a|webm)$/i.test(file))
  : undefined;
const keyStatus = {
  DEEPGRAM_API_KEY: hasEnvValue("DEEPGRAM_API_KEY"),
  ANTHROPIC_API_KEY: hasEnvValue("ANTHROPIC_API_KEY"),
  REDIS_URL: hasEnvValue("REDIS_URL"),
};

console.log("\nCOLLINA DEMO PREFLIGHT\n");
console.log(`${status(nodeMajor >= 20)}  Node ${process.versions.node}`);
console.log(`${status(existsSync(envPath))}  .env.local`);
console.log(`${usesMockClient ? "SAFE" : "REAL"}  debate client mode`);
console.log(`${demoAudio ? "OK" : "MISSING"}  recorded demo audio${demoAudio ? ` (${demoAudio})` : ""}`);

for (const [name, configured] of Object.entries(keyStatus)) {
  console.log(`${status(configured)}  ${name}`);
}

const errors: string[] = [];
if (nodeMajor < 20) errors.push("Node 20 or newer is required.");
if (!existsSync(clientPath)) errors.push("lib/debate-client.ts is missing.");

if (!usesMockClient) {
  for (const [name, configured] of Object.entries(keyStatus)) {
    if (!configured) errors.push(`${name} is required by the merged real client.`);
  }
  if (!demoAudio) errors.push("A recorded demo audio file is required by the merged real client.");
}

if (usesMockClient) {
  console.log("\nFrontend mock mode is active while the backend branch is developed. This is stage-safe.");
} else {
  console.log("\nMerged real mode is active. Run one full rehearsal before going on stage.");
}

if (errors.length) {
  console.error("\nPREFLIGHT FAILED");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("\nPREFLIGHT PASSED\n");
}
