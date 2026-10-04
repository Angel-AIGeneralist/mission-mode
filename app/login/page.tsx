"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { sendPhoneOtp } from "@/lib/auth/actions";

export default function LoginPage() {
  const router = useRouter();
  const [digits, setDigits] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSending(true);
    try {
      const result = await sendPhoneOtp(digits);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/verify");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F3FF] text-[#1A1433]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Your mobile number</h1>
        <p className="mt-2 text-base leading-6 text-[#1A1433]/70">
          We&apos;ll send a 6-digit code to sign you in.
        </p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <label htmlFor="phone" className="text-sm font-semibold">
            Mobile number
          </label>
          <div className="flex gap-2">
            <span className="flex h-12 w-16 items-center justify-center rounded-[10px] border-[1.5px] border-[#D1D5DB] bg-white text-base">
              +91
            </span>
            <input
              id="phone"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={digits}
              onChange={(event) => setDigits(event.target.value.replace(/\D/g, "").slice(0, 10))}
              className="h-12 min-w-0 flex-1 rounded-[10px] border-[1.5px] border-[#D1D5DB] bg-white px-3 text-base text-[#1A1433] outline-none focus:border-[#F7A800]"
            />
          </div>
          {error ? <p className="text-sm text-[#EF4444]">{error}</p> : null}
          <button
            type="submit"
            disabled={sending || digits.length !== 10}
            className="h-12 rounded-[10px] bg-[#1A1433] text-base font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send OTP"}
          </button>
        </form>
      </div>
    </main>
  );
}
