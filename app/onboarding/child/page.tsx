"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveChildProfiles } from "@/lib/onboarding/actions";
import {
  DOMAINS,
  DURATIONS,
  GENDERS,
  LANGUAGES,
  MATERIALS,
  interestCode,
  tierForSelectionIndex,
  type DomainId,
  type DurationValue,
  type Language,
  type SelectedInterest,
} from "@/lib/onboarding/child-profile";

const MAX_CHILDREN = 4;
const MAX_INTERESTS = 6;
const MIN_AGE = 4;
const MAX_AGE = 10;

type ChildDraft = {
  key: string;
  name: string;
  age: number;
  gender: string;
  language: Language;
  interests: SelectedInterest[];
  materials: string[];
  duration: DurationValue | "";
  openDomains: DomainId[];
  interestMessage: string | null;
};

function newChild(): ChildDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    age: 6,
    gender: "",
    language: "English",
    interests: [],
    materials: [],
    duration: "",
    openDomains: [],
    interestMessage: null,
  };
}

function tierBadge(tier: 1 | 2 | 3) {
  if (tier === 1) {
    return { text: "⭐ Tier 1", color: "#F7A800" };
  }
  if (tier === 2) {
    return { text: "Tier 2", color: "#3F4A00" };
  }
  return { text: "Tier 3", color: "#71717A" };
}

function chipBorder(tier: 1 | 2 | 3 | null): string {
  if (tier === 1) return "2px solid #F7A800";
  if (tier === 2) return "1.5px solid #CCEE00";
  return "1px solid #d4d4d8";
}

export default function ChildOnboardingPage() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildDraft[]>([newChild()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateChild(key: string, patch: Partial<ChildDraft>) {
    setChildren((current) =>
      current.map((child) => (child.key === key ? { ...child, ...patch } : child)),
    );
  }

  function toggleDomain(key: string, domainId: DomainId) {
    setChildren((current) =>
      current.map((child) => {
        if (child.key !== key) return child;
        const open = child.openDomains.includes(domainId) ? [] : [domainId];
        return { ...child, openDomains: open };
      }),
    );
  }

  function toggleInterest(key: string, interest: SelectedInterest) {
    setChildren((current) =>
      current.map((child) => {
        if (child.key !== key) return child;
        const existing = child.interests.findIndex((item) => item.code === interest.code);
        if (existing >= 0) {
          return {
            ...child,
            interests: child.interests.filter((item) => item.code !== interest.code),
            interestMessage: null,
          };
        }
        if (child.interests.length >= MAX_INTERESTS) {
          return { ...child, interestMessage: "You can choose up to 6 interests." };
        }
        return {
          ...child,
          interests: [...child.interests, interest],
          interestMessage: null,
        };
      }),
    );
  }

  function toggleMaterial(key: string, material: string) {
    setChildren((current) =>
      current.map((child) => {
        if (child.key !== key) return child;
        const selected = child.materials.includes(material)
          ? child.materials.filter((item) => item !== material)
          : [...child.materials, material];
        return { ...child, materials: selected };
      }),
    );
  }

  function addChild() {
    setChildren((current) => (current.length >= MAX_CHILDREN ? current : [...current, newChild()]));
  }

  function removeChild(key: string) {
    setChildren((current) =>
      current.length === 1 ? current : current.filter((child) => child.key !== key),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    for (const [index, child] of children.entries()) {
      const label = children.length > 1 ? `child ${index + 1}` : "your child";
      if (!child.name.trim()) {
        setError(`Enter a name for ${label}.`);
        return;
      }
      if (child.age < MIN_AGE || child.age > MAX_AGE) {
        setError(`Age for ${label} must be between 4 and 10.`);
        return;
      }
      if (child.interests.length < 1) {
        setError(`Choose at least one interest for ${label}.`);
        return;
      }
      if (!child.duration) {
        setError(`Choose a mission length for ${label}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const result = await saveChildProfiles(
        children.map((child) => ({
          name: child.name,
          age: child.age,
          gender: child.gender,
          language: child.language,
          duration: child.duration,
          interests: child.interests.map((interest) => ({
            code: interest.code,
            domain: interest.domain,
          })),
          materials: child.materials,
        })),
      );
      if (result.error) {
        setError(result.error);
        return;
      }

      router.push("/onboarding/witness");
    } finally {
      setSubmitting(false);
    }
  }

  const fieldClass =
    "h-14 w-full appearance-none rounded-2xl border border-[#E6E0D6] bg-white px-4 text-base text-[#1C1917] outline-none";

  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#1C1917]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-5">
        <div className="flex items-center justify-between">
          <Link
            href="/onboarding/parent"
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#E7E2D8] text-[#1C1917]"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ←
            </span>
          </Link>
          <p className="text-sm text-[#8A847A]">Step 2 of 4</p>
        </div>
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#E4DDD2]"
          role="progressbar"
          aria-valuenow={50}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Onboarding progress"
        >
          <div className="h-full w-1/2 rounded-full bg-[#F15B3A]" />
        </div>

        <form className="mt-8 flex flex-col gap-8" onSubmit={handleSubmit}>
          {children.map((child, index) => {
            const tierOne = child.interests[0];
            const displayName = child.name.trim();
            const openDomain = DOMAINS.find((domain) => child.openDomains.includes(domain.id));
            return (
              <section key={child.key} className="flex flex-col gap-6">
                {children.length > 1 ? (
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold">Child {index + 1}</h2>
                    <button type="button" onClick={() => removeChild(child.key)} className="text-sm text-[#8A847A]">
                      Remove
                    </button>
                  </div>
                ) : null}

                {index === 0 ? (
                  <h1 className="text-[2rem] font-extrabold leading-[1.15] tracking-tight">
                    Meet your little explorer.
                  </h1>
                ) : null}

                <div className="flex flex-col gap-2">
                  <label htmlFor={`child-name-${child.key}`} className="text-sm font-semibold">
                    Child&apos;s name
                  </label>
                  <input
                    id={`child-name-${child.key}`}
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="Maya"
                    value={child.name}
                    onChange={(event) => updateChild(child.key, { name: event.target.value })}
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`child-age-${child.key}`} className="text-sm font-semibold">
                      Age
                    </label>
                    <div className="relative">
                      <select
                        id={`child-age-${child.key}`}
                        value={child.age}
                        onChange={(event) => updateChild(child.key, { age: Number(event.target.value) })}
                        className={`${fieldClass} pr-10`}
                      >
                        {Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, offset) => MIN_AGE + offset).map((age) => (
                          <option key={age} value={age}>
                            {age} years
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A847A]">
                        ▾
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor={`child-language-${child.key}`} className="text-sm font-semibold">
                      Mission language
                    </label>
                    <div className="relative">
                      <select
                        id={`child-language-${child.key}`}
                        value={child.language}
                        onChange={(event) => updateChild(child.key, { language: event.target.value as Language })}
                        className={`${fieldClass} pr-10`}
                      >
                        {LANGUAGES.map((language) => (
                          <option key={language} value={language}>
                            {language}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A847A]">
                        ▾
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-bold leading-snug">
                    What lights {displayName || "them"} up?{" "}
                    <span className="font-medium text-[#E7A08A]">Choose up to 6</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    {DOMAINS.map((domain) => {
                      const open = child.openDomains.includes(domain.id);
                      const selectedInDomain = child.interests.some((item) => item.domain === domain.id);
                      const highlighted = open || selectedInDomain;
                      return (
                        <button
                          key={domain.id}
                          type="button"
                          aria-expanded={open}
                          onClick={() => toggleDomain(child.key, domain.id)}
                          className={`min-h-28 rounded-2xl border px-4 py-3 text-left ${
                            highlighted ? "border-[#F07A62] bg-[#FFF3EC]" : "border-[#EFEAE4] bg-white"
                          }`}
                        >
                          <span className="text-xl" aria-hidden="true">
                            {domain.icon}
                          </span>
                          <span className="mt-3 block text-base font-bold">{domain.label}</span>
                          <span className="mt-0.5 block text-sm text-[#8A847A]">{domain.blurb}</span>
                        </button>
                      );
                    })}
                  </div>

                  {openDomain ? (
                    <div className="flex flex-wrap gap-2">
                      {openDomain.interests.map((label) => {
                        const code = interestCode(openDomain.id, label);
                        const selectedIndex = child.interests.findIndex((item) => item.code === code);
                        const tier = selectedIndex >= 0 ? tierForSelectionIndex(selectedIndex) : null;
                        const badge = tier ? tierBadge(tier) : null;
                        return (
                          <button
                            key={code}
                            type="button"
                            aria-pressed={selectedIndex >= 0}
                            onClick={() =>
                              toggleInterest(child.key, {
                                code,
                                domain: openDomain.id,
                                domainLabel: openDomain.label,
                                label,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm"
                            style={{ border: chipBorder(tier) }}
                          >
                            {label}
                            {badge ? (
                              <span className="text-xs font-medium" style={{ color: badge.color }}>
                                {badge.text}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}

                  {tierOne ? (
                    <p className="text-sm leading-6 text-[#5C574F]">
                      {tierOne.domainLabel} is Tier 1 — this drives what your child physically does in the mission
                    </p>
                  ) : null}
                  {child.interestMessage ? <p className="text-sm text-[#5C574F]">{child.interestMessage}</p> : null}
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-bold">Materials</h2>
                  <div className="flex flex-wrap gap-2">
                    {MATERIALS.map((material) => {
                      const selected = child.materials.includes(material);
                      return (
                        <button
                          key={material}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleMaterial(child.key, material)}
                          className={`rounded-full border px-3 py-1.5 text-sm ${
                            selected
                              ? "border-[#F07A62] bg-[#FFF3EC] text-[#1C1917]"
                              : "border-[#E6E0D6] bg-white text-[#1C1917]"
                          }`}
                        >
                          {material}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor={`child-gender-${child.key}`} className="text-sm font-semibold">
                    Gender <span className="font-normal text-[#8A847A]">(optional)</span>
                  </label>
                  <div className="relative">
                    <select
                      id={`child-gender-${child.key}`}
                      value={child.gender}
                      onChange={(event) => updateChild(child.key, { gender: event.target.value })}
                      className={`${fieldClass} pr-10`}
                    >
                      <option value="">Skip</option>
                      {GENDERS.map((gender) => (
                        <option key={gender} value={gender}>
                          {gender}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#8A847A]">
                      ▾
                    </span>
                  </div>
                </div>

                <fieldset className="flex flex-col gap-3">
                  <legend className="text-base font-bold">Duration</legend>
                  {DURATIONS.map((duration) => (
                    <label key={duration.value} className="flex items-center gap-3 text-sm">
                      <input
                        type="radio"
                        name={`duration-${child.key}`}
                        value={duration.value}
                        checked={child.duration === duration.value}
                        onChange={() => updateChild(child.key, { duration: duration.value })}
                        className="h-4 w-4 accent-[#F15B3A]"
                      />
                      {duration.label} {duration.detail}
                    </label>
                  ))}
                </fieldset>
              </section>
            );
          })}

          {children.length < MAX_CHILDREN ? (
            <button type="button" onClick={addChild} className="self-start text-sm font-semibold underline">
              Add another child
            </button>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="h-12 rounded-2xl bg-[#1C1917] text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </main>
  );
}
