"use server";

import { birthYearForAge, tierForSelectionIndex } from "@/lib/onboarding/child-profile";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ChildSaveInput = {
  name: string;
  age: number;
  gender: string;
  language: string;
  duration: string;
  interests: { code: string; domain: string }[];
  materials: string[];
};

async function currentUserClient() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveParentProfile(input: {
  parentName: string;
  language: string;
  sendTime: string;
}): Promise<{ error?: string }> {
  const { supabase, user } = await currentUserClient();
  if (!user) {
    return { error: "Sign in before saving your profile." };
  }

  const { error } = await supabase.from("profiles").insert({
    parent_name: input.parentName,
    language: input.language,
    send_time: input.sendTime,
    auth_user_id: user.id,
  });

  if (error) {
    return { error: "Could not save your profile. Try again." };
  }
  return {};
}

export async function saveChildProfiles(children: ChildSaveInput[]): Promise<{ error?: string }> {
  const { supabase, user } = await currentUserClient();
  if (!user) {
    return { error: "Sign in before saving child profiles." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "Save the parent profile before adding a child." };
  }

  for (const child of children) {
    const { data: created, error: childError } = await supabase
      .from("children")
      .insert({
        profile_id: profile.id,
        name: child.name.trim(),
        birth_year: birthYearForAge(child.age),
        pronouns: child.gender || null,
        language: child.language,
        duration: child.duration,
      })
      .select("id")
      .single();

    if (childError || !created) {
      return { error: "Could not save the child profile. Try again." };
    }

    const { error: interestError } = await supabase.from("child_interests").insert(
      child.interests.map((interest, index) => ({
        child_id: created.id,
        interest_code: interest.code,
        domain: interest.domain,
        tier: tierForSelectionIndex(index),
        selection_order: index + 1,
        active: true,
      })),
    );

    if (interestError) {
      return { error: "Could not save interests. Try again." };
    }

    if (child.materials.length > 0) {
      const { error: materialError } = await supabase.from("child_materials").insert(
        child.materials.map((material) => ({
          child_id: created.id,
          material_code: material,
          active: true,
        })),
      );
      if (materialError) {
        return { error: "Could not save materials. Try again." };
      }
    }
  }

  return {};
}

export async function loadWitnessFamily(): Promise<{
  profileId: string | null;
  language: string;
  children: { id: string; name: string; pronouns: string | null }[];
}> {
  const { supabase, user } = await currentUserClient();
  if (!user) {
    return { profileId: null, language: "English", children: [] };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, language")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) {
    return { profileId: null, language: "English", children: [] };
  }

  const { data: childRows } = await supabase
    .from("children")
    .select("id, name, pronouns")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: true });

  return {
    profileId: profile.id,
    language: profile.language || "English",
    children: childRows ?? [],
  };
}

export async function saveWitnessRecord(input: {
  witnessId: string | null;
  profileId: string;
  name: string;
  relationship: string;
  phone: string;
  language: string;
  frequency: string;
  childIds: string[];
}): Promise<{ id?: string; error?: string }> {
  const { supabase, user } = await currentUserClient();
  if (!user) {
    return { error: "Sign in and save your parent profile before adding a witness." };
  }

  if (input.witnessId) {
    return { id: input.witnessId };
  }

  const { data: created, error: insertError } = await supabase
    .from("witnesses")
    .insert({
      profile_id: input.profileId,
      name: input.name,
      relationship: input.relationship,
      phone: input.phone,
      language: input.language,
      frequency: input.frequency,
      verified_at: null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return { error: "Could not save the witness. Try again." };
  }

  if (input.childIds.length > 0) {
    const { error: linkError } = await supabase.from("witness_children").insert(
      input.childIds.map((childId) => ({
        witness_id: created.id,
        child_id: childId,
      })),
    );
    if (linkError) {
      return { error: "Could not link the witness to your child. Try again." };
    }
  }

  return { id: created.id };
}

export async function loadConnectProfile(): Promise<{
  error?: string;
  phone: string;
  profileId: string | null;
  sendTime: string | null;
  whatsappStatus: string | null;
}> {
  const { supabase, user } = await currentUserClient();
  if (!user) {
    return {
      error: "Sign in to connect WhatsApp.",
      phone: "",
      profileId: null,
      sendTime: null,
      whatsappStatus: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, send_time, whatsapp_status")
    .eq("auth_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile) {
    return {
      error: "Save your parent profile before connecting WhatsApp.",
      phone: user.phone ?? "",
      profileId: null,
      sendTime: null,
      whatsappStatus: null,
    };
  }

  return {
    phone: user.phone ?? "",
    profileId: profile.id,
    sendTime: profile.send_time,
    whatsappStatus: profile.whatsapp_status,
  };
}

export async function readWhatsappStatus(profileId: string): Promise<string | null> {
  const { supabase, user } = await currentUserClient();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("whatsapp_status")
    .eq("id", profileId)
    .maybeSingle();

  return data?.whatsapp_status ?? null;
}
