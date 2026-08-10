import { BUSINESS } from '../storeHours';
import type { StoreStatus } from '../storeHours';
import { ScreenType } from '../types';

export const Footer = ({ onNavigate, onOpenAbout, storeStatus }: { onNavigate: (screen: ScreenType) => void; onOpenAbout: () => void; storeStatus: StoreStatus | null }) => (
  <footer className="w-full bg-[#070e1d] border-t border-white/10 mt-20 py-12 px-4 md:px-16 text-[#e7bcbf]">
    <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[1.2fr_1fr_auto]">
      <div><h2 className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#ffb2ba]">The Karaoke Kitchen</h2><p className="font-['Space_Mono'] text-xs text-[#e7bcbf]/70 mt-2">Fresh comfort food, café favourites, and full meals in Upper Kandoli.</p></div>
      <div className="text-sm space-y-2"><p><strong className="text-[#dce2f8]">Hours:</strong> Daily, 11:30 AM–2:00 PM and 6:30 PM–9:00 PM</p><p className={storeStatus?.open ? 'text-emerald-300' : 'text-[#ffb2ba]'}>{storeStatus?.message || 'Checking current kitchen status…'}</p><a className="inline-flex text-[#00dbe9] hover:underline" href={BUSINESS.mapUrl} target="_blank" rel="noreferrer">{BUSINESS.address}</a><a className="flex w-fit items-center gap-2 text-[#00dbe9] hover:underline" href={BUSINESS.phoneUrl} aria-label={`Call The Karaoke Kitchen at ${BUSINESS.phone}`}><span className="material-symbols-outlined text-base">call</span>{BUSINESS.phone}</a></div>
      <nav className="flex flex-wrap md:flex-col gap-4 font-['Space_Mono'] text-xs font-bold">
        <button onClick={() => onNavigate('home')} className="hover:text-[#00dbe9]">HOME</button>
        <button onClick={() => onNavigate('menu')} className="hover:text-[#00dbe9]">MENU</button>
        <button onClick={onOpenAbout} className="hover:text-[#00dbe9]">ABOUT</button>
        <button onClick={() => onNavigate('admin-login')} className="hover:text-[#ffb2ba] flex items-center gap-1"><span className="material-symbols-outlined text-sm">admin_panel_settings</span>STAFF LOGIN</button>
      </nav>
    </div>
    <div className="max-w-7xl mx-auto border-t border-white/5 mt-8 pt-6 text-xs font-['Space_Mono'] text-[#e7bcbf]/50">© 2026 The Karaoke Kitchen. All rights reserved.</div>
  </footer>
);
