import type { StoreStatus } from '../storeHours';
import type { ScreenType, User } from '../types';

interface Props {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAbout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  currentUser: User | null;
  storeStatus: StoreStatus | null;
}

const KitchenStatusPill = ({ status }: { status: StoreStatus | null }) => {
  const open = status?.open === true;
  return (
    <span aria-live="polite" title={status?.todayHours || 'Checking kitchen hours'} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-bold font-['Space_Mono'] whitespace-nowrap ${open ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-300' : 'border-[#ffb2ba]/60 bg-[#ffb2ba]/10 text-[#ffb2ba]'}`}>
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-emerald-400' : 'bg-[#ff562c]'}`} />
      {status ? (open ? 'KITCHEN OPEN' : 'KITCHEN CLOSED') : 'CHECKING HOURS'}
    </span>
  );
};

export const TopNavBar = ({ currentScreen, onNavigate, cartCount, onOpenCart, onOpenAbout, searchQuery, onSearchChange, currentUser, storeStatus }: Props) => {
  if (currentScreen === 'checkout') return (
    <header className="fixed top-0 z-50 w-full px-4 md:px-16 py-4 flex justify-between items-center gap-3 glass-panel border-b border-white/10">
      <button onClick={() => onNavigate('home')} className="font-['Bricolage_Grotesque'] text-lg md:text-3xl font-bold text-[#ffb2ba]">The Karaoke Kitchen</button>
      <div className="flex items-center gap-3"><KitchenStatusPill status={storeStatus} /><button onClick={() => onNavigate('menu')} className="font-['Space_Mono'] text-sm font-bold text-[#00dbe9]">✕ <span className="hidden sm:inline">CANCEL</span></button></div>
    </header>
  );
  return (
    <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-10 lg:px-16 py-4 bg-[#0c1322]/90 backdrop-blur-md border-b border-white/10 shadow-[4px_4px_0_0_#00dbe9]">
      <button onClick={() => onNavigate('home')} className="font-['Bricolage_Grotesque'] text-lg md:text-3xl font-extrabold text-[#ffb2ba] tracking-tight">The Karaoke Kitchen</button>
      <div className="hidden lg:flex items-center gap-6 font-['Space_Mono'] text-xs font-bold"><button onClick={() => onNavigate('menu')} className={currentScreen === 'menu' ? 'text-[#00dbe9]' : 'hover:text-[#ffb2ba]'}>MENU</button><button onClick={() => onNavigate('orders')} className={currentScreen === 'orders' ? 'text-[#00dbe9]' : 'hover:text-[#ffb2ba]'}>MY ORDERS</button><button onClick={onOpenAbout} className="hover:text-[#ffb2ba]">ABOUT</button></div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden sm:block"><KitchenStatusPill status={storeStatus} /></div>
        <div className="hidden xl:flex items-center border-b border-[#00dbe9]"><input value={searchQuery} onChange={event => { onSearchChange(event.target.value); if (event.target.value.trim()) onNavigate('menu'); }} placeholder="Search menu…" className="bg-transparent focus:outline-none text-sm w-28 py-1" /><span className="material-symbols-outlined text-[#00dbe9]">search</span></div>
        <button onClick={() => onNavigate('orders')} className="lg:hidden w-9 h-9 rounded-full bg-[#2e3445] grid place-items-center" aria-label="My orders"><span className="material-symbols-outlined text-lg">receipt_long</span></button>
        <button onClick={onOpenCart} className="relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2e3445] grid place-items-center" aria-label="Open cart"><span className="material-symbols-outlined">shopping_cart</span>{cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff562c] text-[10px] font-bold grid place-items-center">{cartCount}</span>}</button>
        <button onClick={() => onNavigate('login')} className={'rounded-full border px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-1 ' + (currentUser ? 'border-[#00dbe9] text-[#00dbe9]' : 'border-white/15')}><span className="material-symbols-outlined text-base">{currentUser ? 'account_circle' : 'login'}</span><span className="hidden sm:inline">{currentUser ? currentUser.firstName : 'SIGN IN'}</span></button>
        <button onClick={() => onNavigate('menu')} className="hidden md:block bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-xs font-bold px-5 py-2 rounded-full">ORDER NOW</button>
      </div>
    </nav>
  );
};