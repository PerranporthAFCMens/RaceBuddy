// Smoke check: quick read-only checks against a deployed site, run by
// .github/workflows/smoke.yml after every deploy and every 30 minutes.
// It never signs in or writes anything.
//
//   SMOKE_URL=https://race-buddy-dev.vercel.app SMOKE_SITE=dev npm run test:smoke
//
// SMOKE_SITE      dev or live: what the site must look like.
// SMOKE_COMMIT    optional git commit the site must be running. The check waits
//                 up to SMOKE_WAIT_SECONDS (default 300) for it to go live.
import { brand } from "../src/design/brand.ts";

const base = (process.env.SMOKE_URL ?? "").replace(/\/+$/, "");
const site = process.env.SMOKE_SITE;
const commit = process.env.SMOKE_COMMIT || undefined;
const waitSeconds = Number(process.env.SMOKE_WAIT_SECONDS ?? 300);
if (!base || (site !== "dev" && site !== "live")) {
  console.error("Set SMOKE_URL and SMOKE_SITE (dev or live).");
  process.exit(2);
}

// A page slower than this fails the check (budget, in milliseconds).
const SLOW_MS = 5000;

let passed = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(name);
    console.log(`  FAIL ${name}${detail === undefined ? "" : ` -> ${JSON.stringify(detail)}`}`);
  }
}

async function get(path: string) {
  const started = Date.now();
  const res = await fetch(base + path, { redirect: "manual", headers: { "user-agent": "race-buddy-smoke" } });
  const text = await res.text();
  return { res, text, ms: Date.now() - started };
}

type Health = { ok: boolean; site: string; commit: string | null; db: boolean; testRaceListed: boolean | null };

async function health() {
  try {
    const { res, text } = await get("/api/health");
    return { status: res.status, body: JSON.parse(text) as Health };
  } catch (e) {
    return { status: 0, body: null, error: String(e) };
  }
}

console.log(`Smoke check: ${base} (${site}${commit ? `, commit ${commit.slice(0, 7)}` : ""})`);

// 1. The right build is serving. Right after a deploy the address can take a
//    moment to switch over, so wait for the expected commit.
let h = await health();
const deadline = Date.now() + waitSeconds * 1000;
while (commit && h.body?.commit !== commit && Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 15_000));
  h = await health();
}
check("health endpoint answers 200", h.status === 200, h.status);
check("database answers", h.body?.db === true, h.body);
check(`site is the ${site} site`, h.body?.site === site, h.body?.site);
if (commit) check(`running commit ${commit.slice(0, 7)}`, h.body?.commit === commit, h.body?.commit);
check(
  site === "live" ? "test race hidden" : "test race listed",
  h.body?.testRaceListed === (site === "dev"),
  h.body?.testRaceListed,
);

// 2. Public pages load, on brand, within budget.
const home = await get("/");
check("home page 200", home.res.status === 200, home.res.status);
check("home page shows the product name", home.text.includes(brand.name));
check(`home page under ${SLOW_MS} ms`, home.ms < SLOW_MS, home.ms);
const noindex = /<meta name="robots" content="noindex/.test(home.text);
check(site === "dev" ? "dev site hidden from search" : "live site visible to search", noindex === (site === "dev"));
const devBar = home.text.includes("Dev site");
check(site === "dev" ? "dev bar shown" : "no dev bar", devBar === (site === "dev"));

const login = await get("/login");
check("login page 200", login.res.status === 200, login.res.status);
check("login page has the email box", /<input[^>]*type="email"/.test(login.text));
check(`login page under ${SLOW_MS} ms`, login.ms < SLOW_MS, login.ms);

const privacy = await get("/privacy");
check("privacy page 200", privacy.res.status === 200, privacy.res.status);

// 3. Styles and scripts the page asks for actually exist.
const assets = [...home.text.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+\.(?:css|js))"/g)].map((m) => m[1]);
check("home page links styles and scripts", assets.length > 0, assets.length);
for (const asset of [...new Set(assets)].slice(0, 6)) {
  const r = await fetch(base + asset);
  check(`asset loads ${asset.split("/").pop()}`, r.ok, r.status);
}

// 4. Signed-in pages stay locked.
const browse = await get("/browse");
const location = browse.res.headers.get("location") ?? "";
check("signed-out visitor sent to login", browse.res.status >= 300 && browse.res.status < 400 && location.includes("/login"), {
  status: browse.res.status,
  location,
});

// 5. Dev-only pages stay off live.
const styleguide = await get("/styleguide");
check(
  site === "live" ? "styleguide hidden on live" : "styleguide open on dev",
  styleguide.res.status === (site === "live" ? 404 : 200),
  styleguide.res.status,
);

console.log(`\n${passed} passed, ${failures.length} failed.`);
if (failures.length) {
  console.log(`Failed: ${failures.join("; ")}`);
  process.exit(1);
}
