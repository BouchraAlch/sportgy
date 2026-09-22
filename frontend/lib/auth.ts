import { createSupabaseBrowserClient } from "./supabaseBrowser";

// Client Signup
export async function signUpClient(
  email: string,
  password: string,
  fullName: string
) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) throw error;

  return data;
}

// Universal Sign In
export async function signInUser(
  email: string,
  password: string
) {
  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

// Sign Out
export async function signOutUser() {
  const supabase = createSupabaseBrowserClient();

  const { error } = await supabase.auth.signOut();

  if (error) throw error;
}

// Get Current User Profile
export async function getCurrentUserProfile() {
  const supabase = createSupabaseBrowserClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;

  return profile;
}