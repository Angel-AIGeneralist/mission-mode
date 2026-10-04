import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requiredEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value =
    name === "NEXT_PUBLIC_SUPABASE_URL"
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

export function createServerClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "The Supabase server client cannot be used in the browser. Import it only from Server Components, Route Handlers, or Server Actions.",
    );
  }

  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

let serverClientSingleton: SupabaseClient | undefined;

function readServerClient(): SupabaseClient {
  if (!serverClientSingleton) {
    serverClientSingleton = createServerClient();
  }
  return serverClientSingleton;
}

export const serverClient: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = readServerClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
