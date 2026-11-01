import type { Instrumentation } from "next";
import { reportServerError } from "@/lib/monitoring";

// Server crashes (pages, route handlers, server actions, proxy) go to Sentry.
// See src/lib/monitoring.ts for what is and is not sent.
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  await reportServerError(error, {
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
