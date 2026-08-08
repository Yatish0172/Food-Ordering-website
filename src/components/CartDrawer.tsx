import React, { useEffect, useRef } from 'react';
import { menuItemUnitPrice } from '../pricing';
import { CartItem, ScreenType } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  subtotal: number;
  onNavigate: (screen: ScreenType) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  onNavigate,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title" className="fixed inset-0 z-50 flex justify-end bg-[#0c1322]/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Click outside to close */}
      <div className="flex-grow" onClick={onClose} aria-hidden="true" />

      {/* Drawer Panel */}
      <div className="w-full max-w-md bg-[#191f2f] h-full border-l-2 border-[#ffb2ba] shadow-2xl flex flex-col p-6 overflow-y-auto">
        {/* Drawer Header */}
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb2ba] text-2xl">
              queue_music
            </span>
            <h2 id="cart-drawer-title" className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#dce2f8]">
              Your Setlist ({cartItems.reduce((acc, item) => acc + item.quantity, 0)})
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close cart"
            onClick={onClose}
            className="text-[#e7bcbf] hover:text-[#ffb2ba] text-2xl cursor-pointer p-1"
          >
            &times;
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-grow py-4 flex flex-col gap-4 overflow-y-auto hide-scrollbar">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6">
              <span className="material-symbols-outlined text-6xl text-[#e7bcbf]/30 mb-3">
                music_off
              </span>
              <p className="font-['Space_Mono'] text-sm text-[#e7bcbf] font-bold">
                Your Setlist is empty!
              </p>
              <p className="font-['Hanken_Grotesk'] text-xs text-[#e7bcbf]/70 mt-1">
                Add some late night hits from the menu to start your order.
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="glass-card p-3 rounded-xl border border-white/10 flex gap-3 items-center group hover:border-[#00dbe9] transition-colors"
              >
                {/* Veg/Non-Veg Badge indicator next to item */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div
                    className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                      item.menuItem.isNonVeg
                        ? 'border-[#ff3d00] bg-[#ff3d00]/10'
                        : 'border-[#00c853] bg-[#00c853]/10'
                    }`}
                  >
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.menuItem.isNonVeg ? 'bg-[#ff3d00]' : 'bg-[#00c853]'
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="flex-grow">
                  <h4 className="font-['Bricolage_Grotesque'] text-base font-bold text-[#dce2f8] leading-tight">
                    {item.menuItem.name}
                  </h4>
                  {item.selectedOption && (
                    <span className="font-['Space_Mono'] text-[10px] text-[#00dbe9] block">
                      {item.selectedOption}
                    </span>
                  )}
                  <span className="font-['Space_Mono'] text-xs font-bold text-[#ffb2ba] block mt-0.5">
                    ₹{menuItemUnitPrice(item.menuItem, item.selectedOption) * item.quantity}
                  </span>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label={'Remove ' + item.menuItem.name}
                    onClick={() => onRemoveItem(item.id)}
                    className="text-[#e7bcbf]/60 hover:text-[#ff562c] text-xs font-['Space_Mono'] transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>

                  <div className="flex items-center border border-white/20 rounded-full bg-[#0c1322] px-2 py-0.5 gap-2">
                    <button
                      type="button"
                      aria-label={'Decrease quantity for ' + item.menuItem.name}
                      onClick={() => onUpdateQuantity(item.id, -1)}
                      className="text-[#dce2f8] hover:text-[#ffb2ba] font-bold text-xs cursor-pointer px-1"
                    >
                      -
                    </button>
                    <span className="font-['Space_Mono'] text-xs font-bold text-[#00eefc]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={'Increase quantity for ' + item.menuItem.name}
                      disabled={item.quantity >= 20}
                      onClick={() => onUpdateQuantity(item.id, 1)}
                      className="text-[#dce2f8] hover:text-[#ffb2ba] font-bold text-xs cursor-pointer px-1"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cartItems.length > 0 && (
          <div className="pt-4 border-t border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-center font-['Bricolage_Grotesque'] text-xl">
              <span className="text-[#dce2f8]">Subtotal</span>
              <span className="text-[#00dbe9] font-bold">₹{subtotal}</span>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigate('checkout');
              }}
              className="w-full bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-sm font-bold uppercase py-3.5 rounded-full neo-brutal-shadow flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
            >
              Checkout <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
