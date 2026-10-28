
import { supabase, supabaseConfigurationError } from './supabase';

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      supabaseConfigurationError ?? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase',
    );
  }

  return supabase;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
) {
  const { data, error } = await requireSupabase().auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: displayName.trim() },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}
