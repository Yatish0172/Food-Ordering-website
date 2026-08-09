import React from 'react';
import type { StoreStatus } from '../storeHours';
import { ScreenType } from '../types';

interface HeroSectionProps {
  onNavigate: (screen: ScreenType) => void;
  storeStatus: StoreStatus | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, storeStatus }) => {
  return (
    <section className="relative w-full rounded-2xl overflow-hidden glass-panel border border-white/10 mb-10 md:mb-16 flex flex-col md:flex-row min-h-[65vh] lg:min-h-[70vh]">
      {/* Background Crowd Photography with Noise and Gradients */}
      <div className="absolute inset-0 z-0">
        <img 
          className="w-full h-full object-cover object-center opacity-60" 
          alt="Guests enjoying a lively evening at Karaoke Kitchen" 
          src="/brand/main-screen-background.png" 
          referrerPolicy="no-referrer"
        />
        <div className="grain-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1322] via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c1322]/90 via-[#0c1322]/40 to-transparent"></div>
      </div>

      {/* Hero Left Text Column */}
      <div className="relative z-10 p-6 md:p-12 lg:p-16 flex flex-col justify-center w-full md:w-1/2">
        <div className="flex items-center gap-2 mb-4 inline-flex bg-[#2e3445]/80 backdrop-blur border border-white/10 rounded-full px-3 py-1 w-fit">
          <div className={`w-3 h-3 rounded-full ${storeStatus?.open ? 'bg-emerald-400 recording-dot' : 'bg-[#ff562c]'}`}></div>
          <span className="font-['Space_Mono'] text-xs text-[#ffdad2] uppercase tracking-widest font-bold">
            {storeStatus ? storeStatus.message : 'Checking kitchen hours…'}
          </span>
        </div>

        <h1 className="font-['Bricolage_Grotesque'] text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-[#dce2f8] mb-4 leading-[0.95] font-extrabold tracking-tight">
          <span className="block">
            Savor the{' '}
            <span className="text-[#00dbe9] inline-block -rotate-2 hover:rotate-2 transition-transform duration-300">
              Beat.
            </span>
          </span>
          <span className="block">
            Eat the{' '}
            <span className="text-[#ffb2ba] inline-block rotate-1 hover:-rotate-1 transition-transform duration-300">
              Volume.
            </span>
          </span>
        </h1>

        <p className="font-['Hanken_Grotesk'] text-base md:text-lg text-[#e7bcbf] max-w-md mb-8 leading-relaxed">
          Fresh comfort food, café favourites, and full meals served in two daily kitchen sessions in Upper Kandoli.
        </p>

        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => onNavigate('menu')} 
            className="bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-sm font-bold px-6 py-3 rounded-full neo-brutal-shadow uppercase flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            Start Order
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              local_fire_department
            </span>
          </button>
          
          <button 
            onClick={() => onNavigate('menu')} 
            className="bg-transparent border-2 border-[#ffb2ba] text-[#ffb2ba] font-['Space_Mono'] text-sm font-bold px-6 py-3 rounded-full hover:bg-[#ffb2ba]/10 transition-colors uppercase cursor-pointer"
          >
            See Menu
          </button>
        </div>
      </div>

      {/* Hero Right Logo Artwork */}
      <div className="relative z-10 w-full md:w-1/2 flex items-center justify-center p-6 md:p-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-[#ffb2ba]/20 blur-3xl rounded-full group-hover:bg-[#00dbe9]/30 transition-colors duration-500"></div>
          <img 
            alt="The Karaoke Kitchen Logo Artwork" 
            className="relative z-10 w-60 sm:w-72 md:w-80 lg:w-96 h-auto filter drop-shadow-[0_0_20px_rgba(255,178,186,0.6)] group-hover:scale-105 transition-transform duration-500" 
            src="/brand/logo.jpg" 
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </section>
  );
};

