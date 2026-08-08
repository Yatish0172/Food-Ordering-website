import { useState, type ChangeEvent, type FormEvent } from 'react';
import { api } from '../api';
import type { ScreenType, User } from '../types';

export const LoginView = ({ currentUser, onAuthenticated, onLogout, onNavigate }: { currentUser: User | null; onAuthenticated: (user: User) => void; onLogout: () => void; onNavigate: (screen: ScreenType) => void }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', streetAddress: '', aptSuite: '', zipCode: '', rememberMe: true });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => setForm(value => ({ ...value, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = mode === 'login'
        ? await api.login(form.email, form.password, form.rememberMe)
        : await api.register(form);
      onAuthenticated(result.user);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  };

  if (currentUser) return (
    <main className="pt-28 pb-16 px-4 min-h-screen">
      <section className="max-w-xl mx-auto glass-panel border border-white/10 rounded-3xl p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ffb2ba] to-[#00dbe9] text-[#071927] grid place-items-center text-3xl font-bold mx-auto">{currentUser.firstName.charAt(0).toUpperCase()}</div>
        <p className="font-['Space_Mono'] text-xs text-[#00dbe9] tracking-[.2em] mt-5">CUSTOMER ACCOUNT</p>
        <h1 className="font-['Bricolage_Grotesque'] text-4xl font-extrabold mt-2">Welcome, {currentUser.firstName}.</h1>
        <div className="mt-6 bg-[#0c1322] rounded-2xl p-5 text-left space-y-3 text-sm">
          <p><span className="text-[#e7bcbf]">Email</span><strong className="block">{currentUser.email}</strong></p>
          <p><span className="text-[#e7bcbf]">Phone</span><strong className="block">{currentUser.phone}</strong></p>
          {currentUser.streetAddress && <p><span className="text-[#e7bcbf]">Delivery address</span><strong className="block">{currentUser.streetAddress}{currentUser.aptSuite ? ', ' + currentUser.aptSuite : ''}{currentUser.zipCode ? ' · ' + currentUser.zipCode : ''}</strong></p>}
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-6"><button onClick={()=>onNavigate('orders')} className="rounded-full bg-[#00dbe9] text-[#002022] py-3 font-bold">MY ORDERS</button><button onClick={()=>onNavigate('menu')} className="rounded-full bg-[#ffb2ba] text-[#670020] py-3 font-bold">ORDER FOOD</button></div>
        <button onClick={onLogout} className="mt-6 text-[#ffb2ba] text-sm hover:underline">Sign out</button>
      </section>
    </main>
  );

  const field = "w-full bg-[#0c1322] border border-white/15 rounded-xl px-4 py-3 focus:outline-none focus:border-[#00dbe9]";
  return (
    <main className="pt-28 pb-16 px-4 min-h-screen">
      <section className="max-w-md mx-auto glass-panel border border-white/10 rounded-3xl p-7 md:p-8">
        <img src="/brand/logo.jpg" alt="The Karaoke Kitchen" className="w-16 h-16 rounded-2xl object-cover mx-auto" />
        <h1 className="font-['Bricolage_Grotesque'] text-4xl font-extrabold text-center text-[#ffb2ba] mt-4">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
        <p className="text-center text-[#e7bcbf] mt-2">{mode === 'login' ? 'Sign in for faster checkout and order history.' : 'Save your details and track every order.'}</p>
        <div className="grid grid-cols-2 bg-[#0c1322] rounded-full p-1 my-6"><button type="button" onClick={()=>setMode('login')} className={'rounded-full py-2 text-xs font-bold ' + (mode==='login'?'bg-[#00dbe9] text-[#002022]':'')}>SIGN IN</button><button type="button" onClick={()=>setMode('register')} className={'rounded-full py-2 text-xs font-bold ' + (mode==='register'?'bg-[#ffb2ba] text-[#670020]':'')}>REGISTER</button></div>
        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && <><div className="grid grid-cols-2 gap-3"><input required className={field} placeholder="First name" value={form.firstName} onChange={update('firstName')} /><input required className={field} placeholder="Last name" value={form.lastName} onChange={update('lastName')} /></div><input required type="tel" pattern="[+0-9 -]{10,16}" className={field} placeholder="Phone number" value={form.phone} onChange={update('phone')} /></>}
          <input required type="email" autoComplete="email" className={field} placeholder="Email address" value={form.email} onChange={update('email')} />
          <input required type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='register'?12:1} maxLength={72} className={field} placeholder={mode==='register'?'Password · minimum 12 characters':'Password'} value={form.password} onChange={update('password')} />
          {mode === 'register' && <><input className={field} placeholder="Street address (optional)" value={form.streetAddress} onChange={update('streetAddress')} /><div className="grid grid-cols-2 gap-3"><input className={field} placeholder="Landmark" value={form.aptSuite} onChange={update('aptSuite')} /><input inputMode="numeric" pattern="[0-9]{6}" className={field} placeholder="PIN code" value={form.zipCode} onChange={update('zipCode')} /></div></>}
          <label className="flex items-center gap-2 text-sm text-[#e7bcbf]"><input type="checkbox" checked={form.rememberMe} onChange={update('rememberMe')} className="accent-[#00dbe9]" /> Keep me signed in on this device</label>
          {error && <p role="alert" className="rounded-xl border border-[#ff562c]/50 bg-[#ff562c]/10 p-3 text-sm text-[#ffdad2]">{error}</p>}
          <button disabled={busy} className="w-full rounded-full bg-[#ffb2ba] text-[#670020] py-3.5 font-bold disabled:opacity-50">{busy ? 'PLEASE WAIT…' : mode === 'login' ? 'SIGN IN SECURELY' : 'CREATE ACCOUNT'}</button>
        </form>
      </section>
    </main>
  );
};

