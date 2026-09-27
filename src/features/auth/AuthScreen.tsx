import { useState, type FormEvent } from 'react';
import { useAuth } from '../../store/authStore';

type Mode = 'signin' | 'signup';

interface PbError {
  status?: number;
  response?: { data?: Record<string, { code?: string }> };
}

function authErrorMessage(err: unknown, mode: Mode) {
  const e = err as PbError;
  if (e.status === 0) return 'ارتباط با سرور برقرار نشد. اتصال اینترنت رو بررسی کن.';
  const data = e.response?.data ?? {};
  if (data.email?.code === 'validation_not_unique') return 'با این ایمیل قبلاً حساب ساخته شده. وارد شو.';
  if (data.email) return 'ایمیل معتبر نیست.';
  if (data.password) return 'رمز عبور باید حداقل ۸ کاراکتر باشه.';
  if (mode === 'signin' && e.status === 400) return 'ایمیل یا رمز عبور اشتباهه.';
  if (e.status === 429) return 'تعداد تلاش‌ها زیاد بود. چند دقیقه بعد دوباره امتحان کن.';
  return 'مشکلی پیش اومد. دوباره امتحان کن.';
}

export function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(name.trim(), email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err, mode));
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>اقدامات مانده</h1>
        <div className="pill-row auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={`pill${mode === 'signin' ? ' active' : ''}`} onClick={() => switchMode('signin')}>
            ورود
          </button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={`pill${mode === 'signup' ? ' active' : ''}`} onClick={() => switchMode('signup')}>
            ساخت حساب
          </button>
        </div>

        {mode === 'signup' && (
          <label>
            اسم
            <input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label>
          ایمیل
          <input required type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          رمز عبور
          <input
            required
            type="password"
            dir="ltr"
            minLength={8}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <div className="auth-error" role="alert">{error}</div>}

        <button type="submit" className="submit" disabled={busy}>
          {busy ? '…' : mode === 'signin' ? 'ورود' : 'ساخت حساب'}
        </button>
      </form>
    </div>
  );
}
