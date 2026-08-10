import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GroupCategory, MenuItem } from '../types';
import { MENU_ITEMS } from '../data/menuItems';

interface MenuViewProps {
  onAddToCart: (item: MenuItem, selectedOption?: string) => void;
  searchQuery: string;
}

export const MenuView: React.FC<MenuViewProps> = ({ onAddToCart, searchQuery }) => {
  const [selectedGroup, setSelectedGroup] = useState<GroupCategory>('All');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('All');
  const [showFloatingCategoryMenu, setShowFloatingCategoryMenu] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const categorySelectorRef = useRef<HTMLDivElement | null>(null);
  const [dietaryFilter, setDietaryFilter] = useState<'All' | 'Veg' | 'Non-Veg'>('All');
  const [activeItemModal, setActiveItemModal] = useState<MenuItem | null>(null);
  const [selectedCustomOption, setSelectedCustomOption] = useState<string>('');

  const groupCategories: GroupCategory[] = [
    'All',
    'Beverages & Refreshers',
    'Shakes & Mocktails',
    'Starters & Snacks',
    'Fast Food & Pizzas',
    'Maggi & Noodles',
    'Main Course & Combos',
    'Rice, Biryani & Breads',
    'Sweets & Desserts',
  ];

  // Derive subcategories available for the currently selected Group Category
  const availableSubCategories = useMemo(() => {
    if (selectedGroup === 'All') {
      const subs = Array.from(new Set(MENU_ITEMS.map((item) => item.subCategory)));
      return ['All', ...subs];
    }
    const filtered = MENU_ITEMS.filter((item) => item.groupCategory === selectedGroup);
    const subs = Array.from(new Set(filtered.map((item) => item.subCategory)));
    return ['All', ...subs];
  }, [selectedGroup]);

  // Handle Group Category change and reset subcategory to 'All'
  const handleSelectGroup = (group: GroupCategory) => {
    setSelectedGroup(group);
    setSelectedSubCategory('All');
  };

  useEffect(() => {
    const selector = categorySelectorRef.current;
    if (!selector || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const hasScrolledPastSelector =
          !entry.isIntersecting && entry.boundingClientRect.bottom < 0;

        setShowFloatingCategoryMenu(hasScrolledPastSelector);
        if (entry.isIntersecting) setIsMobileCategoryMenuOpen(false);
      },
      { threshold: 0.05 },
    );

    observer.observe(selector);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMobileCategoryMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileCategoryMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileCategoryMenuOpen]);

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter((item) => {
      // Search Query
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.subCategory.toLowerCase().includes(q) ||
        item.groupCategory.toLowerCase().includes(q);

      // Group Category
      const matchesGroup =
        selectedGroup === 'All' || q !== '' ? true : item.groupCategory === selectedGroup;

      // Sub Category
      const matchesSub =
        selectedSubCategory === 'All' || q !== '' ? true : item.subCategory === selectedSubCategory;

      // Dietary Preference
      const matchesDiet =
        dietaryFilter === 'All'
          ? true
          : dietaryFilter === 'Veg'
          ? !item.isNonVeg
          : item.isNonVeg === true;

      return matchesSearch && matchesGroup && matchesSub && matchesDiet;
    });
  }, [selectedGroup, selectedSubCategory, dietaryFilter, searchQuery]);

  const handleOpenItemModal = (item: MenuItem) => {
    setActiveItemModal(item);
    setSelectedCustomOption(item.customOptions ? item.customOptions[0] : '');
  };

  const handleConfirmAdd = () => {
    if (activeItemModal) {
      onAddToCart(activeItemModal, selectedCustomOption);
      setActiveItemModal(null);
    }
  };

  return (
    <div className="pt-24 pb-16 px-4 md:px-16 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <header className="mb-8 text-center md:text-left flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-['Bricolage_Grotesque'] text-4xl sm:text-5xl md:text-6xl text-[#ffb2ba] neon-text-primary uppercase mb-2 font-extrabold tracking-tight">
            The Kitchen Menu
          </h1>
          <p className="font-['Hanken_Grotesk'] text-base md:text-lg text-[#e7bcbf] max-w-2xl leading-relaxed">
            Savor the Beat. Eat the Volume. From high-voltage chai & shakes to charcoal tandoori hits & late night momos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#191f2f] px-4 py-2 rounded-full border border-[#00dbe9] shadow-[2px_2px_0px_0px_rgba(0,219,233,0.5)]">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff562c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ff562c]"></span>
          </span>
          <span className="font-['Space_Mono'] text-xs font-bold text-[#ff562c] uppercase tracking-widest animate-pulse">
            Live Kitchen Stage
          </span>
        </div>
      </header>

      {/* Active Search Notification */}
      {searchQuery.trim() !== '' && (
        <div className="mb-6 bg-[#2e3445]/80 p-3 rounded-xl border border-[#00eefc]/50 flex justify-between items-center">
          <span className="font-['Space_Mono'] text-xs md:text-sm text-[#00eefc]">
            Search results for: <span className="text-[#ffb2ba]">"{searchQuery}"</span> ({filteredItems.length} dishes)
          </span>
        </div>
      )}

      {/* GROUP CATEGORIES (TOP LEVEL NAVIGATION) */}
      <div ref={categorySelectorRef} className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="font-['Space_Mono'] text-xs font-bold text-[#00dbe9] uppercase tracking-wider">
            Menu Categories
          </span>
          
          {/* Dietary Filter Buttons */}
          <div className="flex items-center bg-[#151b2b] p-1 rounded-full border border-white/10 gap-1">
            <button
              onClick={() => setDietaryFilter('All')}
              className={`px-3 py-1 rounded-full font-['Space_Mono'] text-xs font-bold transition-all cursor-pointer ${
                dietaryFilter === 'All'
                  ? 'bg-[#dce2f8] text-[#0c1322]'
                  : 'text-[#e7bcbf] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setDietaryFilter('Veg')}
              className={`px-3 py-1 rounded-full font-['Space_Mono'] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                dietaryFilter === 'Veg'
                  ? 'bg-[#00c853] text-white shadow-[0_0_10px_rgba(0,200,83,0.5)]'
                  : 'text-[#00c853] hover:bg-[#00c853]/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00c853]"></span> Veg
            </button>
            <button
              onClick={() => setDietaryFilter('Non-Veg')}
              className={`px-3 py-1 rounded-full font-['Space_Mono'] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                dietaryFilter === 'Non-Veg'
                  ? 'bg-[#ff3d00] text-white shadow-[0_0_10px_rgba(255,61,0,0.5)]'
                  : 'text-[#ff3d00] hover:bg-[#ff3d00]/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ff3d00]"></span> Non-Veg
            </button>
          </div>
        </div>

        {/* Group Category Tabs */}
        <div className="flex overflow-x-auto pb-2 gap-2.5 snap-x hide-scrollbar">
          {groupCategories.map((group) => {
            const isActive = selectedGroup === group && searchQuery.trim() === '';
            return (
              <button
                key={group}
                onClick={() => handleSelectGroup(group)}
                className={`snap-start shrink-0 px-5 py-2.5 rounded-2xl font-['Space_Mono'] text-xs md:text-sm font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#00dbe9] text-[#002022] brutal-shadow-pink border border-transparent scale-105'
                    : 'bg-[#191f2f] text-[#dce2f8] border border-white/15 hover:border-[#ffb2ba] hover:text-[#ffb2ba]'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUB-CATEGORY PILLS (SECONDARY NAVIGATION) */}
      {availableSubCategories.length > 2 && (
        <div className="mb-8 flex overflow-x-auto pb-2 gap-2 hide-scrollbar items-center border-t border-b border-white/5 py-3">
          <span className="font-['Space_Mono'] text-[11px] text-[#e7bcbf]/60 uppercase font-bold shrink-0 mr-1">
            Filter:
          </span>
          {availableSubCategories.map((sub) => {
            const isSubActive = selectedSubCategory === sub && searchQuery.trim() === '';
            return (
              <button
                key={sub}
                onClick={() => setSelectedSubCategory(sub)}
                className={`shrink-0 px-3.5 py-1 rounded-full font-['Space_Mono'] text-xs font-medium transition-all cursor-pointer ${
                  isSubActive
                    ? 'bg-[#ffb2ba] text-[#670020] font-bold shadow-[0_0_10px_rgba(255,178,186,0.4)]'
                    : 'bg-[#0c1322] text-[#e7bcbf] border border-white/10 hover:border-[#00eefc]/50 hover:text-[#00eefc]'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}

      {/* Results Count Bar */}
      <div className="mb-6 flex justify-between items-center font-['Space_Mono'] text-xs text-[#e7bcbf]">
        <span>
          Showing <strong className="text-[#00dbe9]">{filteredItems.length}</strong> delicious drops
        </span>
        <span className="text-[#e7bcbf]/60 hidden sm:inline">
          *Custom spice levels available on all dishes
        </span>
      </div>

      {/* MENU DISHES GRID */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-[#151b2b] rounded-3xl border border-white/10 p-8">
          <span className="material-symbols-outlined text-6xl text-[#ff562c] mb-3">restaurant_menu</span>
          <h3 className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#dce2f8] mb-2">
            No dishes found in this category!
          </h3>
          <p className="font-['Hanken_Grotesk'] text-sm text-[#e7bcbf] max-w-md mx-auto mb-6">
            Try clearing your search filters or select a different menu group to explore the rest of The Karaoke Kitchen!
          </p>
          <button
            onClick={() => {
              setSelectedGroup('All');
              setSelectedSubCategory('All');
              setDietaryFilter('All');
            }}
            className="px-6 py-2.5 rounded-full bg-[#00dbe9] text-[#002022] font-['Space_Mono'] text-xs font-bold uppercase brutal-shadow-pink cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            return (
              <article
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden flex flex-col border border-white/10 hover:border-[#00dbe9] transition-all duration-300 group hover:shadow-[0_0_20px_rgba(0,219,233,0.15)] bg-[#191f2f]/80"
              >
                {/* Image or Category Header Container */}
                {item.image ? (
                  <div className="relative h-44 w-full overflow-hidden bg-[#2e3445]">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      alt={item.name}
                      src={item.image}
                      referrerPolicy="no-referrer"
                    />
                    <div className="grain-overlay"></div>
                    {item.tag && (
                      <div className="absolute top-3 right-3 bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider brutal-shadow-cyan font-bold z-10">
                        {item.tag}
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-[#0c1322]/85 backdrop-blur px-2.5 py-1 rounded-md border border-white/10 text-[10px] font-['Space_Mono'] font-bold text-[#00dbe9] z-10">
                      {item.subCategory}
                    </div>
                  </div>
                ) : (
                  <div className="relative h-16 w-full bg-gradient-to-r from-[#191f2f] via-[#232a3d] to-[#0c1322] border-b border-white/5 px-4 py-3 flex justify-between items-center">
                    <span className="font-['Space_Mono'] text-[11px] font-bold text-[#00dbe9]/80 uppercase tracking-wider bg-[#0c1322] px-2.5 py-1 rounded-md border border-white/10">
                      {item.subCategory}
                    </span>
                    {item.tag && (
                      <span className="bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold shadow-sm">
                        {item.tag}
                      </span>
                    )}
                  </div>
                )}

                <div className="p-5 flex flex-col flex-grow justify-between gap-4">
                  <div>
                    {/* Title + Veg/Non-Veg Badge + Price */}
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <div className="flex items-start gap-2">
                        {/* Veg / Non-Veg Indicator Icon */}
                        <div
                          className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-1 ${
                            item.isNonVeg
                              ? 'border-[#ff3d00] bg-[#ff3d00]/10'
                              : 'border-[#00c853] bg-[#00c853]/10'
                          }`}
                          title={item.isNonVeg ? 'Non-Vegetarian' : 'Vegetarian'}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.isNonVeg ? 'bg-[#ff3d00]' : 'bg-[#00c853]'
                            }`}
                          ></div>
                        </div>

                        <div>
                          <h3 className="font-['Bricolage_Grotesque'] text-lg font-bold text-[#dce2f8] leading-tight group-hover:text-[#ffb2ba] transition-colors">
                            {item.name}
                          </h3>
                          <span className="font-['Space_Mono'] text-[10px] text-[#00dbe9]/70 uppercase font-semibold block mt-0.5">
                            {item.subCategory}
                          </span>
                        </div>
                      </div>

                      <span className="font-['Space_Mono'] font-bold text-[#ffb2ba] text-xl shrink-0">
                        ₹{item.price}
                      </span>
                    </div>

                    {item.description && (
                      <p className="font-['Hanken_Grotesk'] text-xs text-[#e7bcbf] leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      item.customOptions && item.customOptions.length > 0
                        ? handleOpenItemModal(item)
                        : onAddToCart(item)
                    }
                    className="w-full py-2.5 rounded-full bg-[#0c1322] text-[#00dbe9] border-2 border-[#00dbe9] font-['Space_Mono'] font-bold text-xs hover:bg-[#00dbe9] hover:text-[#002022] transition-all brutal-shadow-pink flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 mt-2"
                  >
                    <span className="material-symbols-outlined text-base">add</span> Add to Setlist
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}


      {showFloatingCategoryMenu && (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isMobileCategoryMenuOpen}
          aria-controls="mobile-category-menu"
          aria-label="Open menu categories"
          onClick={() => setIsMobileCategoryMenuOpen(true)}
          className="md:hidden fixed bottom-5 right-4 z-40 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-[#00dbe9] text-[#002022] shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined text-[26px] leading-none" aria-hidden="true">
            restaurant_menu
          </span>
          <span className="mt-0.5 text-[10px] font-black uppercase tracking-wide">Menu</span>
        </button>
      )}

      {showFloatingCategoryMenu && isMobileCategoryMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm"
          onClick={() => setIsMobileCategoryMenuOpen(false)}
          role="presentation"
        >
          <section
            id="mobile-category-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-menu-title"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[78vh] w-full overflow-y-auto rounded-t-[2rem] border-t border-white/10 bg-[#0c1322] px-5 pb-8 pt-3 shadow-2xl"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/25" aria-hidden="true" />
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00dbe9]">Browse</p>
                <h2 id="mobile-category-menu-title" className="text-xl font-black text-white">
                  Menu Categories
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close menu categories"
                onClick={() => setIsMobileCategoryMenuOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white active:scale-95"
              >
                <span className="material-symbols-outlined" aria-hidden="true">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {groupCategories.map((group) => {
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      handleSelectGroup(group);
                      setIsMobileCategoryMenuOpen(false);
                    }}
                    className={`min-h-14 rounded-2xl border px-3 py-3 text-left text-sm font-bold transition active:scale-[0.98] ${
                      isSelected
                        ? 'border-[#00dbe9] bg-[#00dbe9] text-[#002022]'
                        : 'border-white/10 bg-white/5 text-white'
                    }`}
                  >
                    {group}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
      {/* Custom Option Selection Modal */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0c1322]/85 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 border-2 border-[#ffb2ba] shadow-[0_0_25px_rgba(255,178,186,0.3)] animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      activeItemModal.isNonVeg
                        ? 'border-[#ff3d00] bg-[#ff3d00]/10'
                        : 'border-[#00c853] bg-[#00c853]/10'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        activeItemModal.isNonVeg ? 'bg-[#ff3d00]' : 'bg-[#00c853]'
                      }`}
                    ></div>
                  </div>
                  <h3 className="font-['Bricolage_Grotesque'] text-2xl font-bold text-[#dce2f8]">
                    {activeItemModal.name}
                  </h3>
                </div>
                <span className="font-['Space_Mono'] text-lg font-bold text-[#00dbe9] block mt-1">
                  ₹{activeItemModal.price}
                </span>
              </div>
              <button
                onClick={() => setActiveItemModal(null)}
                className="text-[#e7bcbf] hover:text-[#ffb2ba] text-2xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            {activeItemModal.description && (
              <p className="font-['Hanken_Grotesk'] text-xs text-[#e7bcbf] mb-6">
                {activeItemModal.description}
              </p>
            )}

            {activeItemModal.customOptions && activeItemModal.customOptions.length > 0 && (
              <div className="mb-6">
                <label className="block font-['Space_Mono'] text-xs uppercase font-bold text-[#ffb2ba] mb-3">
                  Select Option / Addon
                </label>
                <div className="flex flex-col gap-2">
                  {activeItemModal.customOptions.map((option) => (
                    <label
                      key={option}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedCustomOption === option
                          ? 'border-[#00eefc] bg-[#00eefc]/10 text-[#00eefc]'
                          : 'border-white/10 bg-[#191f2f] text-[#dce2f8] hover:border-white/30'
                      }`}
                    >
                      <input
                        type="radio"
                        name="itemOption"
                        checked={selectedCustomOption === option}
                        onChange={() => setSelectedCustomOption(option)}
                        className="accent-[#00eefc]"
                      />
                      <span className="font-['Space_Mono'] text-xs font-bold">{option}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setActiveItemModal(null)}
                className="w-1/2 py-3 rounded-full border border-white/20 font-['Space_Mono'] text-xs font-bold text-[#dce2f8] hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAdd}
                className="w-1/2 py-3 rounded-full bg-[#ffb2ba] text-[#670020] font-['Space_Mono'] text-xs font-bold neo-brutal-shadow uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
