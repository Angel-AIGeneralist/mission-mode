"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWitnessFamily, saveWitnessRecord } from "@/lib/onboarding/actions";

const RELATIONSHIPS = ["Nani", "Nana", "Dadi", "Dada", "Aunt", "Uncle"] as const;

const FREQUENCIES = [
  { value: "always", label: "After every mission" },
  { value: "weekly", label: "Once a week" },
  { value: "big_wins", label: "Only big wins" },
] as const;

type ChildSummary = {
  id: string;
  name: string;
  pronouns: string | null;
};

function localDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatLocalNumber(digits: string): string {
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function cheerLine(child: ChildSummary | undefined, childCount: number): string {
  if (!child || childCount === 0) {
    return "A grandparent can hear your child's voice notes and cheer them on.";
  }
  if (childCount > 1) {
    return "A grandparent can hear your children's voice notes and cheer them on.";
  }
  const pronoun = child.pronouns === "Girl" ? "her" : child.pronouns === "Boy" ? "him" : "them";
  const name = child.name.trim() || "your child";
  return `A grandparent can hear ${name}'s voice notes and cheer ${pronoun} on.`;
}

export default function WitnessOnboardingPage() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [language, setLanguage] = useState("English");
  const [children, setChildren] = useState<ChildSummary[]>([]);
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number]>("Nani");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]["value"]>("always");
  const [witnessId, setWitnessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFamily() {
      const family = await loadWitnessFamily();
      if (cancelled) return;
      setProfileId(family.profileId);
      setLanguage(family.language);
      setChildren(family.children);
    }

    loadFamily();
    return () => {
      cancelled = true;
    };
  }, []);

  const phoneReady = phoneDigits.length === 10;
  const formStarted = name.trim().length > 0 || phoneDigits.length > 0;
  const formReady = name.trim().length > 0 && phoneReady;

  async function saveWitness(): Promise<string | null> {
    if (!formReady) {
      setError("Enter the grandparent's name and a 10-digit WhatsApp number, or continue without a witness.");
      return null;
    }

    if (!profileId) {
      setError("Sign in and save your parent profile before adding a witness.");
      return null;
    }

    const result = await saveWitnessRecord({
      witnessId,
      profileId,
      name: name.trim(),
      relationship,
      phone: `+91${phoneDigits}`,
      language,
      frequency,
      childIds: children.map((child) => child.id),
    });

    if (result.error || !result.id) {
      setError(result.error ?? "Could not save the witness. Try again.");
      return null;
    }

    setWitnessId(result.id);
    return result.id;
  }

  async function sendVerification() {
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const id = await saveWitness();
      if (!id) return;

      const response = await fetch("/api/whatsapp/witness-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ witnessId: id }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Could not send the verification message.");
        return;
      }
      setNotice("Verification message sent. They can reply YES to confirm.");
    } finally {
      setSending(false);
    }
  }

  async function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!formStarted) {
        router.push("/onboarding/connect");
        return;
      }
      const id = await saveWitness();
      if (!id) return;
      router.push("/onboarding/connect");
    } finally {
      setSaving(false);
    }
  }

  const selectClass =
    "h-14 w-full appearance-none rounded-2xl border border-[#E6E0D6] bg-white px-4 pr-10 text-base text-[#1C2A22] outline-none";

  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#1C2A22]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <Link
            href="/onboarding/child"
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E7E2D8] text-[#1C2A22]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
          </Link>
          <p className="text-sm text-[#8A847A]">Step 3 of 4</p>
        </div>
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E4DDD2]"
          role="progressbar"
          aria-valuenow={75}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div className="h-full w-3/4 rounded-full bg-[#F15B3A]" />
        </div>

        <form className="mt-6 flex flex-col gap-5" onSubmit={handleContinue}>
          <div className="flex items-center gap-3 rounded-2xl bg-[#F3F6D8] px-4 py-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F6E2C8] text-2xl" aria-hidden="true">
              👵
            </span>
            <div>
              <h1 className="text-base font-bold">Add a Mission Witness</h1>
              <p className="mt-0.5 text-sm leading-5 text-[#5E6A62]">{cheerLine(children[0], children.length)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="witness-name" className="text-sm font-semibold">
              Grandparent name
            </label>
            <input
              id="witness-name"
              value={name}
              placeholder="Meera"
              autoComplete="name"
              onChange={(event) => {
                setWitnessId(null);
                setName(event.target.value);
              }}
              className="h-14 rounded-2xl border border-[#E6E0D6] bg-white px-4 text-base outline-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="witness-relationship" className="text-sm font-semibold">
              Relationship
            </label>
            <div className="relative">
              <select
                id="witness-relationship"
                value={relationship}
                onChange={(event) => {
                  setWitnessId(null);
                  setRelationship(event.target.value as (typeof RELATIONSHIPS)[number]);
                }}
                className={selectClass}
              >
                {RELATIONSHIPS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A847A]">
                ▾
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="witness-phone" className="text-sm font-semibold">
              WhatsApp number
            </label>
            <div className="flex gap-2">
              <span className="flex h-14 w-16 items-center justify-center rounded-2xl border border-[#E6E0D6] bg-white text-base">
                +91
              </span>
              <input
                id="witness-phone"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="98400 11223"
                value={formatLocalNumber(phoneDigits)}
                onChange={(event) => {
                  setWitnessId(null);
                  setPhoneDigits(localDigits(event.target.value));
                }}
                className="h-14 min-w-0 flex-1 rounded-2xl border border-[#E6E0D6] bg-white px-4 text-base outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="witness-frequency" className="text-sm font-semibold">
              Send updates
            </label>
            <div className="relative">
              <select
                id="witness-frequency"
                value={frequency}
                onChange={(event) => {
                  setWitnessId(null);
                  setFrequency(event.target.value as (typeof FREQUENCIES)[number]["value"]);
                }}
                className={selectClass}
              >
                {FREQUENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A847A]">
                ▾
              </span>
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {notice ? <p className="text-sm text-[#1F7A3A]">{notice}</p> : null}

          <button
            type="button"
            onClick={sendVerification}
            disabled={!formReady || sending}
            className="h-14 rounded-2xl bg-[#E7E4DC] text-base font-bold text-[#1C2A22] disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send verification message"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-14 rounded-2xl bg-[#F5A524] text-base font-bold text-[#1C2A22] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
