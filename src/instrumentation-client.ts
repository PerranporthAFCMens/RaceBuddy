import * as Sentry from "@sentry/browser";
import { SENTRY_DSN, monitoringEnabled, release, scrubUrl } from "@/lib/monitoring";

// Browser crashes go to Sentry. Errors only: no performance tracing, no
// session replay, no clicks or typing, no headers or cookies, no IP addresses, and no ?query or #hash in
// any web address (sign-in links carry one-time tokens there).
if (monitoringEnabled()) {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_SITE_ENV,
      release: release(),
      dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false },
      tracesSampleRate: 0,
      integrations: (defaults) => [
        ...defaults.filter((i) => i.name !== "Breadcrumbs"),
        Sentry.breadcrumbsIntegration({ dom: false }),
      ],
      beforeBreadcrumb(crumb) {
        const data = crumb.data;
        if (data) {
          for (const key of ["url", "from", "to"]) {
            if (typeof data[key] === "string") data[key] = scrubUrl(data[key]);
          }
        }
        return crumb;
      },
      beforeSend(event) {
        if (event.request) {
          if (event.request.url) event.request.url = scrubUrl(event.request.url);
          delete event.request.cookies;
          delete event.request.query_string;
          if (event.request.headers) {
            const { Referer, ...rest } = event.request.headers;
            event.request.headers = Referer ? { ...rest, Referer: scrubUrl(Referer) } : rest;
          }
        }
        if (event.user) event.user = { id: event.user.id };
        return event;
      },
    });
  } catch {
    // Monitoring must never stop the app loading.
  }
}
