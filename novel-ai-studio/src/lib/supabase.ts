
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

function getConfigurationError() {
  const errors: string[] = [];

  if (!supabaseUrl) {
    errors.push('ขาดตัวแปร VITE_SUPABASE_URL');
  } else {
    try {
      const url = new URL(supabaseUrl);
      const isLocalHttp = url.protocol === 'http:' && (
        url.hostname === 'localhost'
        || url.hostname === '127.0.0.1'
        || url.hostname === '[::1]'
      );

      if (
        (url.protocol !== 'https:' && !isLocalHttp)
        || url.username
        || url.password
        || !url.hostname.includes('.')
      ) {
        errors.push('ตัวแปร VITE_SUPABASE_URL มีรูปแบบไม่ถูกต้อง');
      }
    } catch {
      errors.push('ตัวแปร VITE_SUPABASE_URL มีรูปแบบไม่ถูกต้อง');
    }
  }

  if (!supabaseKey) {
    errors.push(
      'ขาดตัวแปร VITE_SUPABASE_PUBLISHABLE_KEY หรือ VITE_SUPABASE_ANON_KEY',
    );
  } else if (
    supabaseKey.startsWith('sb_secret_')
    || !(
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(supabaseKey)
      || /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(supabaseKey)
    )
  ) {
    errors.push(
      'คีย์ Supabase ไม่ถูกต้อง: ใช้ Publishable key หรือ Anon key เท่านั้น ห้ามใช้ Secret/service_role key',
    );
  }

  return errors.length ? errors.join(' ') : null;
}

export const supabaseConfigurationError = getConfigurationError();

export const supabase = supabaseConfigurationError || !supabaseUrl || !supabaseKey
  ? null
  : createClient(supabaseUrl, supabaseKey);
