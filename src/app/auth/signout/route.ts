import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

/** Signs out, then goes home, or to `next` (a page on this site) if the form sent one. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next"), "/");
  return NextResponse.redirect(new URL(next, request.nextUrl.origin), { status: 303 });
}
