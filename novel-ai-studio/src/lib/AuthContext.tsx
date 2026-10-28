import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

type AuthValue = { user: User | null; loading: boolean };
const AuthContext = createContext<AuthValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = supabase;
    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) console.error('ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ:', error);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch((error: unknown) => {
      if (!active) return;
      console.error('ตรวจสอบสถานะเข้าสู่ระบบไม่สำเร็จ:', error);
      setUser(null);
      setLoading(false);
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
