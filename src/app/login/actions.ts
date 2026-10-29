"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSituation } from "@/lib/matching";
import type { ActionState } from "@/lib/types";

const credentials = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(8, "Passwords need at least 8 characters."),
});

function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === "string" ? next : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/browse";
}

async function siteOrigin() {
  const h = await headers();
  return process.env.NEXT_PUBLIC_SITE_URL ?? h.get("origin") ?? "http://localhost:3000";
}

export async function signIn(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "That email and password don't match. Try again or email yourself a sign-in link." };
  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = credentials.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (formData.get("adult") !== "on") return { error: "Race Buddy is for adults only. Please confirm you are 18 or over." };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const situation = formData.get("situation");
  const start = `/me?welcome=1${isSituation(situation) ? `&situation=${situation}` : ""}`;
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(start)}` },
  });
  if (error) return { error: error.message };
  if (data.session) redirect(start);
  return { ok: true, message: "Nearly there. Check your email and tap the link to confirm your account." };
}

export async function sendSignInLink(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Enter a valid email address." };
  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(safeNext(formData.get("next")))}` },
  });
  // Same answer whether or not the account exists, so emails can't be probed.
  return { ok: true, message: "If that email has an account, a sign-in link is on its way." };
}
