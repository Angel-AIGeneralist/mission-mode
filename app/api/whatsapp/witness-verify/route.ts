import { toWhatsAppAddress } from "@/lib/onboarding/phone";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  let witnessId = "";
  try {
    const body = (await request.json()) as { witnessId?: string };
    witnessId = body.witnessId?.trim() ?? "";
  } catch {
    return jsonError("Choose a witness before sending a verification message.", 400);
  }

  if (!witnessId) {
    return jsonError("Choose a witness before sending a verification message.", 400);
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Sign in before sending a verification message.", 401);
  }

  const { data: witness, error: witnessError } = await supabase
    .from("witnesses")
    .select("id, name, phone, verified_at")
    .eq("id", witnessId)
    .maybeSingle();

  if (witnessError || !witness?.phone) {
    return jsonError("Save the witness before sending a verification message.", 400);
  }

  if (witness.verified_at) {
    return Response.json({ ok: true, alreadyVerified: true });
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

  const witnessName = witness.name?.trim() || "Hello";
  const body = new URLSearchParams({
    From: toWhatsAppAddress(fromNumber),
    To: toWhatsAppAddress(witness.phone),
    Body: `${witnessName}, you are invited to be a Mission Witness. Reply YES to confirm this number. Child updates are not sent until you confirm.`,
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
    return jsonError("Could not send the verification message. Try again.", 502);
  }

  return Response.json({ ok: true });
}
