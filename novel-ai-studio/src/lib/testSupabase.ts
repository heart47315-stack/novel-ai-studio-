
import { supabase, supabaseConfigurationError } from './supabase';

export async function testSupabaseConnection() {
  if (!supabase) {
    return {
      success: false,
      message: supabaseConfigurationError ?? 'ยังไม่ได้ตั้งค่าการเชื่อมต่อ Supabase',
    };
  }

  const { data, error } = await supabase
    .from('novels')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Supabase connection error:', error.message);
    return { success: false, message: error.message };
  }

  console.log('Supabase connected successfully!', data);
  return { success: true, message: 'เชื่อมต่อ Supabase สำเร็จ' };
}
