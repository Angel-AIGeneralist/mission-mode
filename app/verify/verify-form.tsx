"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { resendPhoneOtp, verifyPhoneOtp } from "@/lib/auth/actions";
import { formatParentPhone } from "@/lib/onboarding/phone";

const LENGTH = 6;

export function VerifyForm({ phone }: { phone: string }) {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function writeDigits(start: number, value: string) {
    const incoming = value.replace(/\D/g, "").slice(0, LENGTH - start).split("");
    if (incoming.length === 0) return;
    setDigits((current) => {
      const next = [...current];
      incoming.forEach((digit, offset) => {
        next[start + offset] = digit;
      });
      return next;
    });
    const focusIndex = Math.min(start + incoming.length, LENGTH - 1);
    inputs.current[focusIndex]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const result = await verifyPhoneOtp(digits.join(""));
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setVerifying(false);
    }
  }

  async function resend() {
    setError(null);
    const result = await resendPhoneOtp();
    if (result.error) {
      setError(result.error);
      return;
    }
    setDigits(Array(LENGTH).fill(""));
    setSecondsLeft(60);
    inputs.current[0]?.focus();
  }

  return (
    <main className="min-h-screen bg-[#F5F3FF] text-[#1A1433]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Enter the code</h1>
        <p className="mt-2 text-base leading-6 text-[#1A1433]/70">
          Sent to {formatParentPhone(phone)}
        </p>
        <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element;
                }}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ${index + 1}`}
                value={digit}
                onChange={(event) => writeDigits(index, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Backspace" && !digits[index] && index > 0) {
                    inputs.current[index - 1]?.focus();
                    setDigits((current) => {
                      const next = [...current];
                      next[index - 1] = "";
                      return next;
                    });
                  }
                }}
                onPaste={(event) => {
                  event.preventDefault();
                  writeDigits(index, event.clipboardData.getData("text"));
                }}
                className="h-12 w-12 rounded-[10px] border-[1.5px] border-[#D1D5DB] bg-white text-center text-lg text-[#1A1433] outline-none focus:border-[#F7A800]"
              />
            ))}
          </div>
          {error ? (
            <p role="alert" className="text-sm text-[#EF4444]">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={verifying || digits.join("").length !== LENGTH}
            className="h-12 rounded-[10px] bg-[#1A1433] text-base font-semibold text-white disabled:opacity-60"
          >
            {verifying ? "Checking…" : "Verify"}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={secondsLeft > 0}
            className="text-sm font-semibold text-[#1A1433] underline disabled:no-underline disabled:opacity-60"
          >
            {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
          </button>
        </form>
      </div>
    </main>
  );
}
