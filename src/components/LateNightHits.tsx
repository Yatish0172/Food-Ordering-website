import React from 'react';
import { MenuItem, ScreenType } from '../types';
import { MENU_ITEMS } from '../data/menuItems';

interface LateNightHitsProps {
  onAddToCart: (item: MenuItem) => void;
  onNavigate: (screen: ScreenType) => void;
}

export const LateNightHits: React.FC<LateNightHitsProps> = ({ onAddToCart, onNavigate }) => {
  const friesItem = MENU_ITEMS.find((i) => i.id === 'cheesy-loaded-french-fries') || MENU_ITEMS[0];
  const mojitoItem = MENU_ITEMS.find((i) => i.id === 'blue-lagoon-mojito') || MENU_ITEMS[1];
  const momoItem = MENU_ITEMS.find((i) => i.id === 'butter-chicken-momos') || MENU_ITEMS[2];
  const turkishChicken = MENU_ITEMS.find((i) => i.id === 'cheesy-turkish-tandoori-chicken') || MENU_ITEMS[3];

  return (
    <section className="mb-16">
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-2">
        <div>
          <h2 className="font-['Bricolage_Grotesque'] text-2xl md:text-4xl text-[#dce2f8] font-extrabold uppercase tracking-tight">
            Late Night Stage Hits
          </h2>
          <p className="font-['Space_Mono'] text-xs text-[#e7bcbf]/70 mt-1">
            Top trending drops ordered after 11 PM
          </p>
        </div>
        <button 
          onClick={() => onNavigate('menu')}
          className="font-['Space_Mono'] text-xs md:text-sm font-bold text-[#00dbe9] hover:text-[#ffb2ba] transition-colors flex items-center gap-1 cursor-pointer"
        >
          Explore All Menu <span className="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 auto-rows-[250px]">
        {/* Bento Card 1 (Large 2x2) - Cheesy Loaded French Fries */}
        <div 
          onClick={() => onAddToCart(friesItem)}
          className="col-span-1 md:col-span-2 row-span-1 md:row-span-2 glass-panel rounded-2xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-[#ffb2ba]/50 transition-all shadow-lg"
        >
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
            alt={friesItem.name} 
            src={friesItem.image || 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80'} 
            referrerPolicy="no-referrer"
          />
          <div className="grain-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#070e1d] via-[#0c1322]/50 to-transparent opacity-85"></div>
          
          <div className="absolute top-4 right-4 bg-[#ff562c] text-[#560e00] font-['Space_Mono'] text-xs font-bold px-3 py-1 rounded-full uppercase shadow-[0_0_10px_rgba(255,86,44,0.6)]">
            Stage Hit #1
          </div>

          <div className="absolute bottom-0 left-0 p-6 w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-sm border border-[#00c853] bg-[#00c853]/10 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00c853]"></span>
              </span>
              <span className="font-['Space_Mono'] text-xs font-bold text-[#00dbe9] uppercase">
                {friesItem.subCategory}
              </span>
            </div>
            <h3 className="font-['Bricolage_Grotesque'] text-2xl md:text-3xl font-bold text-[#dce2f8] mb-1 group-hover:text-[#ffb2ba] transition-colors">
              {friesItem.name}
            </h3>
            <div className="flex justify-between items-center">
              <p className="font-['Hanken_Grotesk'] text-sm md:text-base text-[#e7bcbf] line-clamp-1">
                {friesItem.description}
              </p>
              <span className="font-['Space_Mono'] text-lg font-bold text-[#00eefc] bg-[#0c1322]/80 px-3.5 py-1 rounded-full border border-[#00eefc]/30 shrink-0 ml-2">
                ₹{friesItem.price}
              </span>
            </div>
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="inline-flex items-center gap-1 font-['Space_Mono'] text-xs font-bold text-[#ffb2ba] bg-[#670020] px-3.5 py-1.5 rounded-full border border-[#ffb2ba]">
                <span className="material-symbols-outlined text-sm">add_shopping_cart</span> Add to Setlist
              </span>
            </div>
          </div>
        </div>

        {/* Bento Card 2 - Blue Lagoon Mojito */}
        <div 
          onClick={() => onAddToCart(mojitoItem)}
          className="col-span-1 md:col-span-1 row-span-1 glass-panel rounded-2xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-[#00eefc]/50 transition-colors"
        >
          <img 
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
            alt={mojitoItem.name} 
            src={mojitoItem.image || 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'} 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-[#0c1322]/40 group-hover:bg-[#0c1322]/20 transition-colors"></div>
          
          <div className="absolute bottom-0 left-0 p-3 w-full bg-[#2e3445]/90 backdrop-blur border-t border-white/10 flex justify-between items-center">
            <div>
              <h3 className="font-['Space_Mono'] text-xs font-bold text-[#dce2f8] group-hover:text-[#00dbe9] transition-colors truncate max-w-[120px]">
                {mojitoItem.name}
              </h3>
              <span className="font-['Space_Mono'] text-xs font-bold text-[#ffb2ba]">
                ₹{mojitoItem.price}
              </span>
            </div>
            <span className="material-symbols-outlined text-[#00eefc] opacity-0 group-hover:opacity-100 transition-opacity">
              add_circle
            </span>
          </div>
        </div>

        {/* Bento Card 3 - Butter Chicken Momos */}
        <div 
          onClick={() => onAddToCart(momoItem)}
          className="col-span-1 md:col-span-1 row-span-1 glass-panel rounded-2xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-[#ffb2ba]/50 transition-colors flex items-center justify-center p-4 bg-gradient-to-br from-[#ff562c]/10 to-[#670020]/40"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[42px] text-[#ffb2ba] mb-1 group-hover:scale-110 transition-transform">
              local_fire_department
            </span>
            <div className="flex items-center gap-1 mb-1">
              <span className="w-2.5 h-2.5 rounded-sm border border-[#ff3d00] bg-[#ff3d00]/20 flex items-center justify-center">
                <span className="w-1 h-1 rounded-full bg-[#ff3d00]"></span>
              </span>
              <span className="font-['Space_Mono'] text-[10px] text-[#ffb2ba] font-bold">
                HOT DROP
              </span>
            </div>
            <h3 className="font-['Bricolage_Grotesque'] text-xl font-bold text-[#dce2f8]">
              {momoItem.name}
            </h3>
            <span className="font-['Space_Mono'] text-xs text-[#00dbe9] font-bold mt-1">
              ₹{momoItem.price} • Tap to Order
            </span>
          </div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-[#ffb2ba] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
        </div>

        {/* Bento Card 4 (Wide 2x1) - Cheesy Turkish Tandoori Chicken */}
        <div 
          className="col-span-1 md:col-span-2 row-span-1 glass-panel rounded-2xl overflow-hidden relative group border border-white/10 flex items-center bg-[#191f2f]"
        >
          <div className="w-1/3 h-full relative overflow-hidden shrink-0 bg-[#2e3445]">
            <img 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              alt={turkishChicken.name} 
              src="https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=800&q=80" 
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="w-2/3 p-4 md:p-6 relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-sm border border-[#ff3d00] bg-[#ff3d00]/10 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff3d00]"></span>
                </span>
                <span className="font-['Space_Mono'] text-[10px] font-bold text-[#ff562c] uppercase tracking-wider">
                  {turkishChicken.tag || 'Signature Hit'}
                </span>
              </div>
              <h3 className="font-['Bricolage_Grotesque'] text-xl md:text-2xl font-bold text-[#dce2f8] group-hover:text-[#00dbe9] transition-colors leading-tight">
                {turkishChicken.name}
              </h3>
              <p className="font-['Hanken_Grotesk'] text-xs md:text-sm text-[#e7bcbf] mt-1 line-clamp-2">
                {turkishChicken.description}
              </p>
            </div>

            <button 
              onClick={() => onAddToCart(turkishChicken)}
              className="self-start font-['Space_Mono'] text-xs font-bold text-[#dce2f8] border border-white/20 rounded-full px-4 py-1.5 hover:bg-white/10 hover:border-[#ffb2ba] hover:text-[#ffb2ba] transition-all uppercase cursor-pointer mt-2"
            >
              Add to Setlist - ₹{turkishChicken.price}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
