/**
 * Crash reports to Sentry (EU region), for the dev and live sites only.
 *
 * The browser uses the Sentry SDK (src/instrumentation-client.ts). The server
 * sends a plain report from src/instrumentation.ts with no extra packages.
 *
 * Privacy: no cookies, no IP addresses, no request bodies, and web addresses
 * lose their ?query and #hash (sign-in links carry one-time tokens there).
 * Chat text is never attached.
 */
import { siteEnv } from "./site-env.ts";

// Public by design: Sentry's DSN only lets an app send reports in, and every
// visitor's browser receives it anyway.
export const SENTRY_DSN = "https://364ea17653cccef4ed351f21f62caa5f@o4512357800345600.ingest.de.sentry.io/4512357807226960";

/** Only the real sites report. Laptops and CI stay quiet. */
export function monitoringEnabled() {
  const site = siteEnv();
  return site === "live" || site === "dev";
}

export function release() {
  return process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined;
}

/** Drops ?query and #hash, which can hold sign-in tokens or search terms. */
export function scrubUrl(url: string) {
  return url.replace(/[?#].*$/, "");
}

type Frame = { function?: string; filename?: string; lineno?: number; colno?: number; in_app?: boolean };

/** Turns a V8 stack ("at fn (file:1:2)") into Sentry frames, oldest call first. */
export function parseStack(stack: string | undefined): Frame[] {
  if (!stack) return [];
  const frames: Frame[] = [];
  for (const line of stack.split("\n")) {
    const m = line.match(/^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?$/);
    if (!m) continue;
    const filename = m[2];
    frames.push({
      function: m[1] || "<anonymous>",
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !filename.includes("node_modules") && !filename.startsWith("node:"),
    });
  }
  return frames.reverse();
}

export type ServerErrorInfo = {
  path: string;
  method: string;
  routePath?: string;
  routeType?: string;
};

/** Builds a Sentry envelope for one server error. */
export function buildEnvelope(error: unknown, info: ServerErrorInfo, now = new Date()) {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest = typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined;
  const eventId = crypto.randomUUID().replaceAll("-", "");
  const header = { event_id: eventId, sent_at: now.toISOString(), dsn: SENTRY_DSN };
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "node",
    level: "error",
    environment: siteEnv(),
    release: release(),
    transaction: info.routePath ?? scrubUrl(info.path),
    tags: { side: "server", route_type: info.routeType ?? "unknown", ...(digest ? { digest } : {}) },
    request: { url: scrubUrl(info.path), method: info.method },
    exception: {
      values: [{ type: err.name || "Error", value: err.message, stacktrace: { frames: parseStack(err.stack) } }],
    },
  };
  return [JSON.stringify(header), JSON.stringify({ type: "event" }), JSON.stringify(event)].join("\n");
}

/** Where envelopes go, worked out from the DSN. */
export function envelopeUrl(dsn = SENTRY_DSN) {
  const u = new URL(dsn);
  const project = u.pathname.replace(/^\//, "");
  return `${u.protocol}//${u.host}/api/${project}/envelope/?sentry_version=7&sentry_key=${u.username}`;
}

/** Sends one server error to Sentry. Never throws: reporting must not break a page. */
export async function reportServerError(error: unknown, info: ServerErrorInfo) {
  if (!monitoringEnabled()) return;
  try {
    await fetch(envelopeUrl(), {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: buildEnvelope(error, info),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Sentry unreachable: the error is still in the Vercel logs.
  }
}
