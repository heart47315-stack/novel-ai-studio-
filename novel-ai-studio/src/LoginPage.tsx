
import { useState, type FormEvent } from 'react';
import { signIn, signUp } from './lib/authService';
import { loginGoogle } from './lib/authActions';

export default function LoginPage({
  supabaseConfigurationError,
}: {
  supabaseConfigurationError?: string | null;
}) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setGoogleError('');
    setLoading(true);

    try {
      await loginGoogle();
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : 'ล็อกอินด้วย Google ไม่สำเร็จ ลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const result = await signUp(email, password, displayName);

        if (!result.session) {
          setMessage('สมัครสำเร็จ หากระบบขอให้ยืนยันอีเมล กรุณาตรวจสอบกล่องจดหมาย');
        } else {
          setMessage('สมัครสมาชิกสำเร็จ');
        }
      } else {
        await signIn(email, password);
        setMessage('เข้าสู่ระบบสำเร็จ');
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #fff1f7, #f1edff)',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 420,
          boxSizing: 'border-box',
          padding: 32,
          borderRadius: 24,
          background: 'white',
          boxShadow: '0 16px 50px #80649b20',
        }}
      >
        <div style={{ fontSize: 36, textAlign: 'center' }}>✦</div>
        <h1 style={{ textAlign: 'center', color: '#7046a5' }}>
          Novel AI Studio
        </h1>
        <p style={{ textAlign: 'center', color: '#777' }}>
          ผู้ช่วยเขียนนิยายตั้งแต่พล็อตแรกจนถึงบทจบ
        </p>

        {supabaseConfigurationError && (
          <p role="status" style={{ color: '#9a5b00', lineHeight: 1.6 }}>
            ระบบล็อกอินยังไม่ได้ตั้งค่า: {supabaseConfigurationError}
          </p>
        )}

        {mode === 'signup' && (
          <label style={{ display: 'block', marginTop: 16 }}>
            ชื่อที่ใช้แสดง
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={80}
              autoComplete="name"
              style={inputStyle}
            />
          </label>
        )}

        <label style={{ display: 'block', marginTop: 16 }}>
          อีเมล
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'block', marginTop: 16 }}>
          รหัสผ่าน
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            style={inputStyle}
          />
        </label>

        {message && (
          <p role="status" style={{ color: '#7046a5', lineHeight: 1.6 }}>
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 24,
            padding: 14,
            border: 0,
            borderRadius: 12,
            color: 'white',
            background: '#8754bc',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 16,
          }}
        >
          {loading
            ? 'กำลังดำเนินการ...'
            : mode === 'login'
              ? 'เข้าสู่ระบบ'
              : 'สร้างบัญชี'}
        </button>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 14,
            border: '1px solid #e5d9ef',
            borderRadius: 12,
            color: '#4b3b5b',
            background: 'white',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 16,
          }}
        >
          เข้าสู่ระบบด้วย Google
        </button>

        {googleError && (
          <p role="alert" style={{ color: '#b42318', lineHeight: 1.6 }}>
            {googleError}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setMessage('');
          }}
          style={{
            width: '100%',
            marginTop: 12,
            padding: 12,
            border: 0,
            background: 'transparent',
            color: '#7046a5',
            cursor: 'pointer',
          }}
        >
          {mode === 'login'
            ? 'ยังไม่มีบัญชี? สมัครสมาชิก'
            : 'มีบัญชีแล้ว? เข้าสู่ระบบ'}
        </button>
      </form>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  boxSizing: 'border-box' as const,
  width: '100%',
  padding: 12,
  marginTop: 8,
  border: '1px solid #e5d9ef',
  borderRadius: 10,
  fontSize: 16,
};
