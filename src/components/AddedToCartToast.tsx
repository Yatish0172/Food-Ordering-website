import React, { useEffect } from 'react';

interface AddedToCartToastProps {
  isOpen: boolean;
  itemName: string;
  cartCount: number;
  subtotal: number;
  onViewCart: () => void;
  onClose: () => void;
}

export const AddedToCartToast: React.FC<AddedToCartToastProps> = ({
  isOpen,
  itemName,
  cartCount,
  subtotal,
  onViewCart,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      onClose();
    }, 4500);

    return () => clearTimeout(timer);
  }, [isOpen, itemName, cartCount, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-4 left-4 sm:left-auto sm:right-6 z-50 max-w-md w-full animate-in slide-in-from-bottom-5 duration-300">
      <div className="glass-panel bg-[#151b2b]/95 border-2 border-[#00dbe9] p-4 rounded-2xl shadow-[0_0_25px_rgba(0,219,233,0.35)] flex items-center justify-between gap-3 backdrop-blur-md">
        {/* Left Info Section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#00dbe9]/15 border border-[#00dbe9] flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,219,233,0.3)]">
            <span className="material-symbols-outlined text-[#00dbe9] text-xl">
              queue_music
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#00c853] text-sm font-bold">
                check_circle
              </span>
              <span className="font-['Space_Mono'] text-xs font-bold text-[#dce2f8] truncate">
                {itemName}
              </span>
            </div>
            <span className="font-['Hanken_Grotesk'] text-xs text-[#ffb2ba] font-medium mt-0.5">
              {cartCount} {cartCount === 1 ? 'item' : 'items'} in Setlist • ₹{subtotal}
            </span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onViewCart}
            className="bg-[#ffb2ba] text-[#670020] hover:bg-white font-['Space_Mono'] text-xs font-bold py-2 px-3.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-[0_0_10px_rgba(255,178,186,0.4)] hover:scale-105 active:scale-95"
          >
            <span>View Cart</span>
            <span className="material-symbols-outlined text-sm font-bold">
              arrow_forward
            </span>
          </button>

          <button
            onClick={onClose}
            className="text-[#e7bcbf] hover:text-white p-1 cursor-pointer transition-colors"
            title="Dismiss"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
