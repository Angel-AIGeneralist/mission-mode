import { toWhatsAppAddress } from "@/lib/onboarding/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TEST_MESSAGE =
  "Mission Mode is ready! Reply HELLO to confirm this number is active.";

function requiredServerEnv(
  name: "TWILIO_ACCOUNT_SID" | "TWILIO_AUTH_TOKEN" | "TWILIO_WHATSAPP_NUMBER",
): string {
  const value =
    name === "TWILIO_ACCOUNT_SID"
      ? process.env.TWILIO_ACCOUNT_SID
      : name === "TWILIO_AUTH_TOKEN"
        ? process.env.TWILIO_AUTH_TOKEN
        : process.env.TWILIO_WHATSAPP_NUMBER;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Sign in before sending a test message.", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return jsonError("Save your parent profile before connecting WhatsApp.", 400);
  }

  const phone = user.phone;
  if (!phone) {
    return jsonError("No phone number is saved for this profile.", 400);
  }

  let accountSid: string;
  let authToken: string;
  let fromNumber: string;
  try {
    accountSid = requiredServerEnv("TWILIO_ACCOUNT_SID");
    authToken = requiredServerEnv("TWILIO_AUTH_TOKEN");
    fromNumber = requiredServerEnv("TWILIO_WHATSAPP_NUMBER");
  } catch {
    return jsonError("WhatsApp sending is not configured.", 500);
  }

  const body = new URLSearchParams({
    From: toWhatsAppAddress(fromNumber),
    To: toWhatsAppAddress(phone),
    Body: TEST_MESSAGE,
  });

  const twilioResponse = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!twilioResponse.ok) {
    return jsonError("Could not send the WhatsApp message. Try again.", 502);
  }

  return Response.json({ ok: true });
}
