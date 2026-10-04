"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveParentProfile } from "@/lib/onboarding/actions";

const LANGUAGES = ["English", "Hindi", "Hinglish"] as const;

type Language = (typeof LANGUAGES)[number];

function formatMissionTime(value: string): string {
  const [hourText = "0", minute = "00"] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${minute} ${suffix}`;
}

export default function ParentOnboardingPage() {
  const router = useRouter();
  const [parentName, setParentName] = useState("");
  const [language, setLanguage] = useState<Language>("English");
  const [sendTime, setSendTime] = useState("07:30");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const name = parentName.trim();
    if (!name) {
      setError("Enter your first name.");
      return;
    }
    if (!LANGUAGES.includes(language)) {
      setError("Choose a language.");
      return;
    }
    if (!sendTime) {
      setError("Choose a mission send time.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await saveParentProfile({
        parentName: name,
        language,
        sendTime,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/onboarding/child");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#1C2A22]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.back()}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7E2D8] text-[#1C2A22]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
          </button>
          <p className="text-sm text-[#8A847A]">Step 1 of 4</p>
        </div>
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E4DDD2]"
          role="progressbar"
          aria-valuenow={25}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div className="h-full w-1/4 rounded-full bg-[#F15B3A]" />
        </div>

        <h1 className="mt-8 text-[2rem] font-extrabold leading-[1.15] tracking-tight">
          First, tell us about you.
        </h1>
        <p className="mt-3 text-base leading-6 text-[#5E6A62]">
          We&apos;ll use this to make your mission messages feel personal.
        </p>

        <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="parent-name" className="text-sm font-semibold">
              Your first name
            </label>
            <input
              id="parent-name"
              name="parentName"
              type="text"
              required
              autoComplete="given-name"
              placeholder="Ananya"
              value={parentName}
              onChange={(event) => setParentName(event.target.value)}
              className="h-14 rounded-2xl border border-[#E6E0D6] bg-white px-4 text-base text-[#1C2A22] outline-none"
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold">Message language</legend>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((option) => {
                const selected = language === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLanguage(option)}
                    className={`h-11 rounded-full px-5 text-sm font-semibold ${
                      selected
                        ? "bg-[#24312A] text-white"
                        : "border border-[#E6E0D6] bg-white text-[#1C2A22]"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="send-time" className="text-sm font-semibold">
              Morning mission time
            </label>
            <div className="relative">
              <input
                id="send-time"
                name="sendTime"
                type="time"
                required
                value={sendTime}
                onChange={(event) => setSendTime(event.target.value)}
                className="h-14 w-full rounded-2xl border border-[#E6E0D6] bg-white px-4 pr-12 text-base text-transparent outline-none [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-4 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
              />
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-base text-[#1C2A22]">
                {formatMissionTime(sendTime)}
              </span>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#8A847A]" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l2.5 2" strokeLinecap="round" />
                </svg>
              </span>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-14 rounded-2xl bg-[#F5B400] text-base font-bold text-[#1C2A22] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
