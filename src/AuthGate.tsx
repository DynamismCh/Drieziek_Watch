import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { createAuthClient } from '@neondatabase/auth';

const authClient = createAuthClient('https://ep-damp-sunset-bah0etdc.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth');

type Props = { children: ReactNode };

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function refreshSession() {
    try {
      const result: any = await authClient.getSession();
      setUser(result?.data?.user ?? result?.data?.session?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    void refreshSession();
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!url.startsWith('/api/incidents') && !url.startsWith('/api/messages')) {
        return originalFetch(input, init);
      }
      const tokenResult: any = await authClient.token();
      const token = tokenResult?.data?.token;
      if (!token || tokenResult?.error) {
        return new Response(JSON.stringify({ error: 'Please sign in again to continue.' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        });
      }
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      headers.set('Authorization', 'Bearer ' + token);
      return originalFetch(input, { ...init, headers });
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'signup') {
        if (name.trim().length < 2) throw new Error('Enter your name (at least 2 characters).');
        if (password.length < 8) throw new Error('Use a password with at least 8 characters.');
        const result: any = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password });
        if (result?.error) throw new Error(result.error.message || 'Could not create your account.');
        await refreshSession();
        setInfo('Account created. If you are not signed in yet, use the Sign in option.');
      } else {
        const result: any = await authClient.signIn.email({ email: email.trim(), password });
        if (result?.error) throw new Error(result.error.message || 'Sign-in failed. Check your email and password.');
        await refreshSession();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    setUser(null);
    setInfo('');
  }

  if (checking) {
    return <main style={styles.page}><section style={styles.card}>Checking your sign-in…</section></main>;
  }

  if (!user) {
    return (
      <main style={styles.page}>
        <section style={styles.card}>
          <div style={styles.mark}>DW</div>
          <p style={styles.eyebrow}>DRIEZIEK COMMUNITY SAFETY</p>
          <h1 style={styles.heading}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</h1>
          <p style={styles.copy}>Sign in to view community alerts, report incidents and share safety updates.</p>
          <div style={styles.tabs}>
            <button type="button" onClick={() => { setMode('signin'); setError(''); }} style={mode === 'signin' ? styles.activeTab : styles.tab}>Sign in</button>
            <button type="button" onClick={() => { setMode('signup'); setError(''); }} style={mode === 'signup' ? styles.activeTab : styles.tab}>Create account</button>
          </div>
          <form onSubmit={submit} style={styles.form}>
            {mode === 'signup' && <label style={styles.label}>Your name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} style={styles.input} placeholder="Full name" /></label>}
            <label style={styles.label}>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} placeholder="you@example.com" /></label>
            <label style={styles.label}>Password<input required type="password" minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} style={styles.input} placeholder="At least 8 characters" /></label>
            {error && <p role="alert" style={styles.error}>{error}</p>}
            {info && <p role="status" style={styles.info}>{info}</p>}
            <button type="submit" disabled={busy} style={styles.submit}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in securely'}</button>
          </form>
          <p style={styles.foot}>Your account is for using Drieziek Watch only. It does not give access to app administration or backend settings.</p>
        </section>
      </main>
    );
  }

  return (
    <>
      <div style={styles.signOutWrap}>
        <span style={styles.signedInAs}>{user.email || user.name || 'Signed-in resident'}</span>
        <button type="button" onClick={() => void signOut()} style={styles.signOut}>Sign out</button>
      </div>
      {children}
    </>
  );
}

const styles: Record<string, import('react').CSSProperties> = {
  page: { minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f5f7fa', padding: 24, fontFamily: "'DM Sans', sans-serif", color: '#1b2635' },
  card: { width: '100%', maxWidth: 430, background: '#fff', border: '1px solid #e6ebf0', borderRadius: 16, padding: 30, boxShadow: '0 14px 45px #142c4012' },
  mark: { width: 48, height: 48, display: 'grid', placeItems: 'center', borderRadius: 14, background: '#f5b64e', color: '#142c40', fontWeight: 900, fontSize: 17 },
  eyebrow: { margin: '18px 0 7px', fontSize: 10, fontWeight: 800, letterSpacing: 1.2, color: '#758294' },
  heading: { fontSize: 27, lineHeight: 1.2, margin: '0 0 9px', color: '#142c40', fontWeight: 800 },
  copy: { fontSize: 13, lineHeight: 1.6, color: '#758294', marginBottom: 20 },
  tabs: { display: 'flex', borderBottom: '1px solid #e6ebf0', marginBottom: 20 },
  tab: { flex: 1, padding: 11, background: 'white', border: 0, color: '#758294', fontWeight: 700 },
  activeTab: { flex: 1, padding: 11, background: 'white', border: 0, borderBottom: '3px solid #c6534e', color: '#142c40', fontWeight: 800 },
  form: { display: 'grid', gap: 15 },
  label: { display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#455669' },
  input: { width: '100%', padding: '12px 13px', border: '1px solid #dbe2e8', borderRadius: 8, fontSize: 14, color: '#1b2635', background: '#fff' },
  error: { color: '#b42318', fontSize: 12, margin: 0 },
  info: { color: '#246c51', fontSize: 12, margin: 0 },
  submit: { padding: 13, border: 0, borderRadius: 8, background: '#c6534e', color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer' },
  foot: { margin: '20px 0 0', fontSize: 11, lineHeight: 1.6, color: '#8a96a5' },
  signOutWrap: { position: 'fixed', top: 10, right: 12, zIndex: 9999, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 9, background: '#fff', border: '1px solid #e6ebf0', boxShadow: '0 2px 10px #142c4012' },
  signedInAs: { fontSize: 11, color: '#758294', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  signOut: { border: '1px solid #dbe2e8', borderRadius: 6, background: '#fff', padding: '6px 9px', color: '#455669', fontSize: 11, fontWeight: 700, cursor: 'pointer' },
};
