import { ScreenType } from '../types';

export const Footer = ({ onNavigate, onOpenAbout }: { onNavigate: (screen: ScreenType) => void; onOpenAbout: () => void }) => (
  <footer className="w-full bg-[#070e1d] border-t border-white/10 mt-20 py-12 px-4 md:px-16 text-[#e7bcbf]">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
      <div><h2 className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#ffb2ba]">The Karaoke Kitchen</h2><p className="font-['Space_Mono'] text-xs text-[#e7bcbf]/70 mt-2">High-voltage late night street food engineered for the afterparty.</p></div>
      <nav className="flex flex-wrap gap-6 font-['Space_Mono'] text-xs font-bold">
        <button onClick={()=>onNavigate('home')} className="hover:text-[#00dbe9]">HOME</button>
        <button onClick={()=>onNavigate('menu')} className="hover:text-[#00dbe9]">MENU</button>
        <button onClick={onOpenAbout} className="hover:text-[#00dbe9]">ABOUT</button>
        <button onClick={()=>onNavigate('admin-login')} className="hover:text-[#ffb2ba] flex items-center gap-1"><span className="material-symbols-outlined text-sm">admin_panel_settings</span>STAFF LOGIN</button>
      </nav>
    </div>
    <div className="max-w-7xl mx-auto border-t border-white/5 mt-8 pt-6 text-xs font-['Space_Mono'] text-[#e7bcbf]/50">© 2026 The Karaoke Kitchen. All rights reserved.</div>
  </footer>
);

