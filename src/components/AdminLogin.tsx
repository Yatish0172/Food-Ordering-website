import { useState, type FormEvent } from 'react';
import { api } from '../api';

export const AdminLogin = ({ onLogin, onBack }: { onLogin: (token: string) => void; onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api.adminLogin(email, password); onLogin(result.token); }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign in failed.'); setBusy(false); }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-[#070e1d]">
      <section className="hidden lg:flex relative overflow-hidden p-16 flex-col justify-between border-r border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,219,233,.22),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(255,178,186,.2),transparent_45%)]" />
        <div className="relative"><span className="font-['Space_Mono'] text-[#00dbe9] tracking-[.25em] text-xs">OPERATIONS CONSOLE</span><h1 className="font-['Bricolage_Grotesque'] text-7xl font-extrabold text-[#ffb2ba] mt-4 leading-[.9]">Kitchen<br/>Control.</h1></div>
        <p className="relative text-[#e7bcbf] max-w-md">Securely manage incoming orders, payment states, fulfilment progress, and daily performance.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-md glass-panel border border-white/10 rounded-3xl p-8">
          <button type="button" onClick={onBack} className="text-[#00dbe9] text-xs font-['Space_Mono'] mb-8">← CUSTOMER SITE</button>
          <span className="material-symbols-outlined text-5xl text-[#ffb2ba]">shield_lock</span>
          <h2 className="font-['Bricolage_Grotesque'] text-4xl font-extrabold mt-3">Admin sign in</h2>
          <p className="text-[#e7bcbf] mt-2 mb-7">Authorized kitchen staff only.</p>
          <label className="block text-xs font-['Space_Mono'] text-[#00dbe9] mb-2">EMAIL</label>
          <input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-[#0c1322] border border-white/15 rounded-xl p-3 mb-5 focus:outline-none focus:border-[#00dbe9]" />
          <label className="block text-xs font-['Space_Mono'] text-[#00dbe9] mb-2">PASSWORD</label>
          <input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full bg-[#0c1322] border border-white/15 rounded-xl p-3 focus:outline-none focus:border-[#00dbe9]" />
          {error && <p role="alert" className="mt-4 text-[#ffdad2] bg-[#ff562c]/10 border border-[#ff562c]/40 rounded-lg p-3 text-sm">{error}</p>}
          <button disabled={busy} className="w-full mt-6 py-3.5 rounded-full bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] font-bold disabled:opacity-50">{busy ? 'SIGNING IN…' : 'SIGN IN SECURELY'}</button>
        </form>
      </section>
    </main>
  );
};


