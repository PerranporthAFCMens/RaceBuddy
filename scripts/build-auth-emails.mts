// Writes the branded Supabase auth emails to supabase/templates/.
// `--check` fails if the files are out of date (run `npm run auth-emails`).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { authEmails } from "../src/lib/auth-emails.ts";

const dir = new URL("../supabase/templates/", import.meta.url);
const check = process.argv.includes("--check");
const stale: string[] = [];

const index = [
  "# Sign-up and sign-in emails",
  "",
  "Built by `npm run auth-emails` from `src/lib/auth-emails.ts`. Do not edit these files by hand.",
  "",
  "Supabase sends these. To update them: Supabase > Authentication > Emails > Templates. For each row,",
  "open the template, paste the subject, switch the body to source/HTML, paste the whole file, and save.",
  "",
  "| Supabase template | Subject | File |",
  "| --- | --- | --- |",
  ...authEmails().map((e) => `| ${e.supabaseName} | ${e.subject} | \`${e.file}.html\` |`),
  "",
].join("\n");

const files: [string, string][] = [...authEmails().map((e): [string, string] => [`${e.file}.html`, e.html]), ["README.md", index]];

if (!check) mkdirSync(dir, { recursive: true });
for (const [name, body] of files) {
  const target = new URL(name, dir);
  if (check) {
    let current = "";
    try {
      current = readFileSync(target, "utf8");
    } catch {}
    if (current !== body) stale.push(name);
  } else {
    writeFileSync(target, body);
  }
}

if (check && stale.length) {
  console.error(`supabase/templates is out of date (${stale.join(", ")}). Run \`npm run auth-emails\` and commit the result.`);
  process.exit(1);
}
console.log(check ? "Auth email templates are up to date." : `Wrote ${files.length} files to supabase/templates/`);
