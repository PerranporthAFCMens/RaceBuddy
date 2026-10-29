import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseBaseUrl } from "./url";

const PUBLIC_PATHS = ["/", "/login", "/auth", "/privacy", "/manifest.webmanifest", "/api/cron", "/styleguide"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}

/** Refreshes the Supabase session cookie and sends signed-out visitors to /login. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !key) return response;
  const url = supabaseBaseUrl(rawUrl);

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Must run straight after creating the client: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  if (!signedIn && !isPublic(request.nextUrl.pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(login);
  }
  return response;
}
