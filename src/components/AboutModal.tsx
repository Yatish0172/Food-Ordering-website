import React, { useEffect, useRef } from 'react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="about-modal-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c1322]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 md:p-8 border-2 border-[#00dbe9] shadow-[0_0_30px_rgba(0,219,233,0.2)] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <img
              alt="The Karaoke Kitchen Logo"
              className="w-12 h-12 object-contain"
              src="/brand/logo.jpg"
              referrerPolicy="no-referrer"
            />
            <div>
              <h2 id="about-modal-title" className="font-['Bricolage_Grotesque'] text-2xl md:text-3xl font-bold text-[#ffb2ba]">
                About The Karaoke Kitchen
              </h2>
              <span className="font-['Space_Mono'] text-xs font-bold text-[#00dbe9] uppercase tracking-wider">
                Savor the Beat. Eat the Volume.
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close about dialog"
            onClick={onClose}
            className="text-[#e7bcbf] hover:text-[#ffb2ba] text-3xl cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="space-y-4 font-['Hanken_Grotesk'] text-base text-[#e7bcbf] leading-relaxed">
          <p>
            Born in a neon-drenched alleyway between a 2:00 AM karaoke lounge and a sizzling street wok stage, <strong className="text-[#dce2f8]">The Karaoke Kitchen</strong> was built for those who refuse to let the night end early.
          </p>
          <p>
            We pair high-voltage beat drop energy with chef-crafted late-night street food. From our crunch-heavy <strong className="text-[#00dbe9]">Neon Nacho Fries</strong> to the sweet chaos of our <strong className="text-[#ffb2ba]">Acid Slush</strong>, every drop on our menu is loud, unapologetic, and engineered for maximum afterparty fuel.
          </p>
          <div className="p-4 bg-[#191f2f] rounded-2xl border border-white/10 my-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#ff562c] text-2xl shrink-0">
              speaker
            </span>
            <div>
              <h4 className="font-['Space_Mono'] text-sm font-bold text-[#dce2f8] mb-1">
                KITCHEN RULES
              </h4>
              <ul className="font-['Space_Mono'] text-xs text-[#e7bcbf] space-y-1 list-disc list-inside">
                <li>Sing like no one is listening; eat like you just rocked Stadium 4.</li>
                <li>Extra hot honey is non-negotiable.</li>
                <li>Pickup orders at the stage bar when your mic number is called.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full bg-[#00dbe9] text-[#002022] font-['Space_Mono'] text-xs font-bold uppercase brutal-shadow-pink cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            Got It, Back to the Jam
          </button>
        </div>
      </div>
    </div>
  );
};

