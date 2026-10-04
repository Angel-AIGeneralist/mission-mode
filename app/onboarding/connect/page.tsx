"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadConnectProfile, readWhatsappStatus } from "@/lib/onboarding/actions";
import { formatParentPhone, formatSendTimeLabel } from "@/lib/onboarding/phone";

type Phase = "loading" | "ready" | "sending" | "sent" | "connected";

export default function ConnectOnboardingPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [phone, setPhone] = useState("");
  const [sendTimeLabel, setSendTimeLabel] = useState("7:30 AM");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const profile = await loadConnectProfile();
      if (cancelled) return;

      if (profile.phone) setPhone(formatParentPhone(profile.phone));
      if (profile.sendTime) setSendTimeLabel(formatSendTimeLabel(profile.sendTime));
      setProfileId(profile.profileId);

      if (profile.error) {
        setError(profile.error);
        setPhase("ready");
        return;
      }

      setPhase(profile.whatsappStatus === "connected" ? "connected" : "ready");
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (phase !== "sent" || !profileId) return;

    const id = profileId;
    let cancelled = false;

    async function checkStatus() {
      const status = await readWhatsappStatus(id);
      if (!cancelled && status === "connected") {
        setPhase("connected");
      }
    }

    checkStatus();
    const timer = setInterval(checkStatus, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [phase, profileId]);

  async function sendTestMessage() {
    setError(null);
    setPhase("sending");

    const response = await fetch("/api/whatsapp/test-send", { method: "POST" });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? "Could not send the test message.");
      setPhase("ready");
      return;
    }

    setPhase("sent");
  }

  const statusText =
    phase === "sent"
      ? "Message sent — check WhatsApp and reply HELLO"
      : phase === "sending"
        ? "Sending your test message"
        : "Ready to send a test message";

  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#1C2A22]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <Link
            href="/onboarding/witness"
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7E2D8] text-[#1C2A22]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
          </Link>
          <p className="text-sm text-[#8A847A]">Step 4 of 4</p>
        </div>
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E4DDD2]"
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div className="h-full w-full rounded-full bg-[#F15B3A]" />
        </div>

        <div className="mt-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#DDF3DE]">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" fill="#C9B6E4">
              <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v6A3.5 3.5 0 0 1 15.5 16H10l-4.2 3.2A.8.8 0 0 1 4.5 18.5V6.5Z" />
            </svg>
          </div>
          <h1 className="mt-6 text-[2rem] font-extrabold leading-[1.15] tracking-tight">
            Let&apos;s connect WhatsApp.
          </h1>
          <p className="mt-3 max-w-xs text-base leading-6 text-[#5E6A62]">
            We&apos;ll send your first real mission tomorrow at {sendTimeLabel}.
          </p>
        </div>

        <label htmlFor="whatsapp-number" className="mt-8 text-sm font-semibold">
          Your WhatsApp
        </label>
        <input
          id="whatsapp-number"
          readOnly
          value={phone}
          placeholder="+91"
          className="mt-2 h-14 rounded-2xl border border-[#E6E0D6] bg-white px-4 text-base text-[#1C2A22] outline-none"
        />

        {phase === "connected" ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-center">
            <p className="flex items-center gap-2 text-base font-semibold text-[#1F7A3A]">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1F7A3A] text-sm text-white"
              >
                ✓
              </span>
              WhatsApp connected
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="h-14 w-full rounded-2xl bg-[#F5A524] text-base font-bold text-[#1C2A22]"
            >
              Go to dashboard
            </button>
          </div>
        ) : (
          <>
            <p className="mt-4 rounded-2xl bg-[#F8F1D4] px-4 py-3 text-center text-sm text-[#6E6758]">
              {statusText}
            </p>
            {error ? (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={sendTestMessage}
              disabled={phase === "loading" || phase === "sending" || phase === "sent"}
              className="mt-4 h-14 rounded-2xl bg-[#F5A524] text-base font-bold text-[#1C2A22] disabled:opacity-60"
            >
              {phase === "sending" ? "Sending…" : "Send me a test message"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
