"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseBaseUrl } from "./url";

/** Supabase client for the browser (live chat). */
export function createClient() {
  return createBrowserClient(
    supabaseBaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
