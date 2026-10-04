export const LANGUAGES = ["English", "Hindi", "Hinglish"] as const;

export const GENDERS = ["Girl", "Boy", "Other"] as const;

export const MATERIALS = [
  "Paper",
  "Crayons",
  "Cardboard",
  "Scissors",
  "Glue",
  "Clay",
  "Blocks",
  "Kitchen",
  "Garden",
  "Books",
  "Instrument",
  "Sports equipment",
  "Torch",
] as const;

export const DURATIONS = [
  { value: "15-20", label: "Short", detail: "15–20 minutes" },
  { value: "20-30", label: "Medium", detail: "20–30 minutes" },
  { value: "30-40", label: "Long", detail: "30–40 minutes" },
] as const;

export const DOMAINS = [
  {
    id: "nature",
    label: "Nature",
    icon: "🦕",
    blurb: "Animals, plants",
    interests: ["Bugs", "Birds", "Plants", "Weather", "Stones", "Water"],
  },
  {
    id: "creative",
    label: "Creative",
    icon: "🎨",
    blurb: "Drawing, making",
    interests: ["Drawing", "Making", "Music", "Stories", "Building", "Pretend"],
  },
  {
    id: "physical",
    label: "Physical",
    icon: "🏃",
    blurb: "Movement, sport",
    interests: ["Running", "Dance", "Ball games", "Balance", "Stretching", "Jumping"],
  },
  {
    id: "cognitive",
    label: "Cognitive",
    icon: "🧩",
    blurb: "Puzzles, science",
    interests: ["Puzzles", "Numbers", "Patterns", "Memory", "Experiments", "Maps"],
  },
  {
    id: "social",
    label: "Social",
    icon: "🔎",
    blurb: "Helping, cooking",
    interests: ["Helping", "Team games", "Feelings", "Sharing", "Family", "Friends"],
  },
  {
    id: "cultural",
    label: "Cultural",
    icon: "🎭",
    blurb: "Stories, music",
    interests: ["Festivals", "Cooking", "Languages", "Home stories", "Crafts", "Songs"],
  },
] as const;

export type Language = (typeof LANGUAGES)[number];
export type DurationValue = (typeof DURATIONS)[number]["value"];
export type DomainId = (typeof DOMAINS)[number]["id"];

export type SelectedInterest = {
  code: string;
  domain: DomainId;
  domainLabel: string;
  label: string;
};

export function interestCode(domainId: string, label: string): string {
  return `${domainId}.${label.toLowerCase().replace(/\s+/g, "-")}`;
}

export function tierForSelectionIndex(index: number): 1 | 2 | 3 {
  if (index <= 0) return 1;
  if (index <= 2) return 2;
  return 3;
}

export function birthYearForAge(age: number, now = new Date()): number {
  return now.getFullYear() - age;
}
