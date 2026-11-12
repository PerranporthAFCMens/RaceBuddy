// Security rules for the code, run by `npm run security:check` (in CI and in `npm run verify`).
// Each rule guards a mistake that would leak data or open a door. Fix the code,
// never loosen a rule to get a pass.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const problems: string[] = [];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sourceFiles = walk(join(root, "src"))
  .filter((f) => /\.(ts|tsx|mts)$/.test(f) && !/\.test\.tsx?$/.test(f))
  .map((path) => ({ path: relative(root, path), text: readFileSync(path, "utf8") }));

const isServerOnly = (text: string) =>
  /^import "server-only";/m.test(text) || /^"use server";/m.test(text) || /^\s*export (async )?function (GET|POST|PUT|PATCH|DELETE)\b/m.test(text);

// 1. Secrets only in server code. Anything readable in the browser is public.
//    A file that reads a secret must import "server-only" (the build then
//    refuses to send it to the browser) or be a server action / route handler.
const PUBLIC_ENV = /^(NEXT_PUBLIC_|NODE_ENV$|VERCEL_ENV$|VERCEL_PROJECT_PRODUCTION_URL$|CI$)/;
for (const { path, text } of sourceFiles) {
  const secrets = [...text.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]).filter((n) => !PUBLIC_ENV.test(n));
  if (secrets.length && !isServerOnly(text) && path !== "src/proxy.ts") {
    problems.push(`${path}: reads ${[...new Set(secrets)].join(", ")} but is not server-only. Add import "server-only".`);
  }
  if (/^"use client";/m.test(text) && /supabase\/admin|SERVICE_ROLE/.test(text)) {
    problems.push(`${path}: browser code must never use the service-role (admin) client.`);
  }
}

// 2. Browser-visible settings must not look like secrets.
const ALLOWED_PUBLIC_KEYS = new Set(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]);
const everything = [
  ...sourceFiles,
  ...["next.config.ts", ".github/workflows/ci.yml"].map((p) => ({ path: p, text: readFileSync(join(root, p), "utf8") })),
];
for (const { path, text } of everything) {
  for (const [name] of text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
    if (/SECRET|SERVICE|PRIVATE|TOKEN|PASSWORD|KEY/.test(name) && !ALLOWED_PUBLIC_KEYS.has(name)) {
      problems.push(`${path}: ${name} would be sent to every browser. Secrets must not start with NEXT_PUBLIC_.`);
    }
  }
}

// 3. No raw HTML or code built from strings in the app (cross-site scripting).
for (const { path, text } of sourceFiles) {
  if (/dangerouslySetInnerHTML|\beval\(|new Function\(|\.innerHTML\s*=/.test(text)) {
    problems.push(`${path}: raw HTML or eval. Render text with JSX instead.`);
  }
}

// 4. Server actions are public web addresses: each one must check who is signed in.
//    Sign-in and sign-up actions are the only exceptions.
const OPEN_ACTION_FILES = new Set(["src/app/login/actions.ts"]);
for (const { path, text } of sourceFiles) {
  if (!/^"use server";/m.test(text) || OPEN_ACTION_FILES.has(path)) continue;
  const parts = text.split(/(?=^export async function )/m).slice(1);
  for (const part of parts) {
    const name = part.match(/^export async function (\w+)/)?.[1];
    if (!/\brequire(User|Profile)\(/.test(part)) {
      problems.push(`${path}: server action ${name} must call requireUser() or requireProfile() first.`);
    }
  }
}

// 5. Every API route checks who is calling, or says on purpose that it is public.
for (const { path, text } of sourceFiles) {
  if (!/^src\/app\/api\/.+\/route\.ts$/.test(path)) continue;
  const guarded = /CRON_SECRET|\brequire(User|Profile)\(|getUser\(|webhooks\.constructEvent/.test(text);
  if (!guarded && !text.includes("security-check: public route")) {
    problems.push(`${path}: API route has no access check. Add one, or the comment "// security-check: public route" if it shows nothing private.`);
  }
}

// 6. No environment files or private keys committed.
// Vercel builds have no git history, so this rule runs in CI and on laptops only.
let tracked: string[] = [];
try {
  tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split("\n").filter(Boolean);
} catch {}
for (const path of tracked) {
  const base = path.split("/").pop()!;
  if ((/^\.env/.test(base) && base !== ".env.example") || /\.(pem|key|p12|pfx)$/.test(base)) {
    problems.push(`${path}: secret files must never be in the repo.`);
  }
}

if (problems.length) {
  console.error(`Security check failed (${problems.length}):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log("Security check passed.");
