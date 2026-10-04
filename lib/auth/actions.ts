"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PHONE_COOKIE = "mm-otp-phone";

function phoneCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
  };
}

function toIndianE164(digits: string): string | null {
  const local = digits.replace(/\D/g, "");
  if (local.length !== 10) return null;
  return `+91${local}`;
}

export async function sendPhoneOtp(digits: string): Promise<{ error?: string }> {
  const phone = toIndianE164(digits);
  if (!phone) {
    return { error: "Enter a 10-digit mobile number." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate") || message.includes("seconds")) {
      return { error: "Please wait before requesting another code." };
    }
    return { error: "Could not send the code. Try again." };
  }

  cookies().set(PHONE_COOKIE, phone, phoneCookieOptions());
  return {};
}

export async function resendPhoneOtp(): Promise<{ error?: string }> {
  const phone = cookies().get(PHONE_COOKIE)?.value;
  if (!phone) {
    return { error: "Send a new code from the login screen." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("rate") || message.includes("seconds")) {
      return { error: "Please wait before requesting another code." };
    }
    return { error: "Could not send the code. Try again." };
  }

  cookies().set(PHONE_COOKIE, phone, phoneCookieOptions());
  return {};
}

export async function verifyPhoneOtp(token: string): Promise<{ error: string }> {
  const code = token.replace(/\D/g, "");
  if (code.length !== 6) {
    return { error: "Enter the 6-digit code." };
  }

  const phone = cookies().get(PHONE_COOKIE)?.value;
  if (!phone) {
    return { error: "Send a new code from the login screen." };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: "sms",
  });

  if (error || !data.user) {
    return { error: "That code is incorrect. Try again." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  cookies().delete(PHONE_COOKIE);

  if (profile) {
    redirect("/dashboard");
  }
  redirect("/onboarding");
}
