import { supabase } from './supabase';

export async function loginGoogle() {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}