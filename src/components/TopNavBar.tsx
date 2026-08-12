import { useEffect, useRef, useState } from 'react';
import { BUSINESS, type StoreStatus } from '../storeHours';
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

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
    <path d="M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.38-1.47A9.96 9.96 0 0 0 12.04 22 10 10 0 0 0 12.04 2Zm0 18.17a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.19.87.85-3.1-.2-.32a8.14 8.14 0 1 1 6.97 3.86Zm4.46-6.08c-.24-.12-1.44-.71-1.66-.79-.23-.08-.39-.12-.56.12-.16.25-.63.8-.77.96-.14.17-.29.19-.53.07-.25-.12-1.03-.38-1.97-1.22a7.38 7.38 0 0 1-1.36-1.69c-.14-.24-.02-.37.1-.5.11-.1.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.34-.76-1.83-.2-.48-.41-.41-.56-.42h-.48c-.16 0-.43.06-.65.31-.23.24-.86.84-.86 2.05 0 1.2.88 2.37 1 2.53.12.16 1.73 2.64 4.18 3.7.59.25 1.04.4 1.4.52.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28Z" />
  </svg>
);

export const TopNavBar = ({ currentScreen, onNavigate, cartCount, onOpenCart, onOpenAbout, searchQuery, onSearchChange, currentUser, storeStatus }: Props) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isSearchOpen) return;
    searchInputRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSearchOpen]);

  const updateSearch = (value: string) => {
    onSearchChange(value);
    if (value.trim()) onNavigate('menu');
  };

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
        <a href={`https://wa.me/91${BUSINESS.phone}`} target="_blank" rel="noreferrer" aria-label={`Connect with The Karaoke Kitchen on WhatsApp at ${BUSINESS.phone}`} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25D366] px-2.5 text-xs font-bold text-[#071a0e] transition hover:bg-[#20bd5a] md:h-10 md:px-4"><WhatsAppIcon /><span className="hidden sm:inline">CONNECT NOW</span></a>
        <div className="hidden xl:flex items-center border-b border-[#00dbe9]"><input value={searchQuery} onChange={event => updateSearch(event.target.value)} placeholder="Search menu…" aria-label="Search dishes" className="bg-transparent focus:outline-none text-sm w-28 py-1" /><span className="material-symbols-outlined text-[#00dbe9]" aria-hidden="true">search</span></div>
        <button type="button" onClick={() => setIsSearchOpen(open => !open)} className="xl:hidden w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2e3445] grid place-items-center text-[#00dbe9]" aria-label={isSearchOpen ? 'Close dish search' : 'Search dishes'} aria-expanded={isSearchOpen} aria-controls="mobile-dish-search"><span className="material-symbols-outlined" aria-hidden="true">{isSearchOpen ? 'close' : 'search'}</span></button>
        <button onClick={() => onNavigate('orders')} className="lg:hidden w-9 h-9 rounded-full bg-[#2e3445] grid place-items-center" aria-label="My orders"><span className="material-symbols-outlined text-lg">receipt_long</span></button>
        <button onClick={onOpenCart} className="relative w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#2e3445] grid place-items-center" aria-label="Open cart"><span className="material-symbols-outlined">shopping_cart</span>{cartCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff562c] text-[10px] font-bold grid place-items-center">{cartCount}</span>}</button>
        <button onClick={() => onNavigate('login')} className={'rounded-full border px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-1 ' + (currentUser ? 'border-[#00dbe9] text-[#00dbe9]' : 'border-white/15')}><span className="material-symbols-outlined text-base">{currentUser ? 'account_circle' : 'login'}</span><span className="hidden sm:inline">{currentUser ? currentUser.firstName : 'SIGN IN'}</span></button>
        <button onClick={() => onNavigate('menu')} className="hidden md:block bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-xs font-bold px-5 py-2 rounded-full">ORDER NOW</button>
      </div>
      {isSearchOpen && (
        <form id="mobile-dish-search" role="search" onSubmit={event => { event.preventDefault(); onNavigate('menu'); setIsSearchOpen(false); }} className="xl:hidden absolute left-0 right-0 top-full border-b border-[#00dbe9]/40 bg-[#0c1322]/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-[#00dbe9] bg-[#151b2b] px-4">
            <span className="material-symbols-outlined text-[#00dbe9]" aria-hidden="true">search</span>
            <input ref={searchInputRef} value={searchQuery} onChange={event => updateSearch(event.target.value)} type="search" inputMode="search" enterKeyHint="search" autoComplete="off" placeholder="Search dishes…" aria-label="Search dishes" className="min-w-0 flex-1 bg-transparent py-3 text-base text-white outline-none placeholder:text-[#e7bcbf]/60" />
            {searchQuery && <button type="button" onClick={() => updateSearch('')} className="grid h-9 w-9 place-items-center rounded-full text-[#e7bcbf]" aria-label="Clear dish search"><span className="material-symbols-outlined text-xl" aria-hidden="true">backspace</span></button>}
          </div>
        </form>
      )}
    </nav>
  );
};
