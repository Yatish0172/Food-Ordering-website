import { useEffect, useMemo, useState } from 'react';
import { ScreenType, MenuItem, CartItem, OrderRecord, User } from './types';
import { api } from './api';
import { MENU_ITEMS } from './data/menuItems';
import { menuItemUnitPrice } from './pricing';
import type { StoreStatus } from './storeHours';
import { TopNavBar } from './components/TopNavBar';
import { HeroSection } from './components/HeroSection';
import { LateNightHits } from './components/LateNightHits';
import { MenuView } from './components/MenuView';
import { CheckoutView } from './components/CheckoutView';
import { OrderConfirmationView } from './components/OrderConfirmationView';
import { CartDrawer } from './components/CartDrawer';
import { AddedToCartToast } from './components/AddedToCartToast';
import { AboutModal } from './components/AboutModal';
import { Footer } from './components/Footer';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { LoginView } from './components/LoginView';
import { OrdersView } from './components/OrdersView';

const loadCart = (): CartItem[] => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('tkk-cart') || '[]');
    if (!Array.isArray(saved)) return [];
    const catalog = new Map(MENU_ITEMS.map(item => [item.id, item]));
    return saved.flatMap(raw => {
      if (!raw || typeof raw !== 'object') return [];
      const candidate = raw as Partial<CartItem>;
      const menuItemId = candidate.menuItem?.id;
      const menuItem = typeof menuItemId === 'string' ? catalog.get(menuItemId) : undefined;
      const quantity = Number(candidate.quantity);
      const selectedOption = typeof candidate.selectedOption === 'string' ? candidate.selectedOption : undefined;
      if (!menuItem || !Number.isInteger(quantity) || quantity < 1) return [];
      if (selectedOption && !menuItem.customOptions?.includes(selectedOption)) return [];
      return [{
        id: typeof candidate.id === 'string' ? candidate.id : crypto.randomUUID(),
        menuItem,
        quantity: Math.min(quantity, 20),
        selectedOption,
      }];
    });
  } catch {
    return [];
  }
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [cartItems, setCartItems] = useState<CartItem[]>(loadCart);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [latestOrder, setLatestOrder] = useState<OrderRecord | null>(null);
  const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('tkk-admin-token') || '');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [storeStatus, setStoreStatus] = useState<StoreStatus | null>(null);
  const [toastNotification, setToastNotification] = useState({ show: false, itemName: '' });

  useEffect(() => localStorage.setItem('tkk-cart', JSON.stringify(cartItems)), [cartItems]);
  useEffect(() => {
    api.me().then(result => setCurrentUser(result.user)).catch(() => setCurrentUser(null)).finally(() => setAuthLoading(false));
  }, []);
  useEffect(() => {
    let active = true;
    const refreshStoreStatus = () => api.storeStatus().then(result => { if (active) setStoreStatus(result.store); }).catch(() => undefined);
    refreshStoreStatus();
    const timer = window.setInterval(refreshStoreStatus, 30_000);
    window.addEventListener('focus', refreshStoreStatus);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', refreshStoreStatus); };
  }, []);

  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const subtotal = useMemo(
    () => cartItems.reduce(
      (sum, item) => sum + menuItemUnitPrice(item.menuItem, item.selectedOption) * item.quantity,
      0,
    ),
    [cartItems],
  );

  const handleAddToCart = (item: MenuItem, selectedOption?: string) => {
    setCartItems(prev => {
      const existingIndex = prev.findIndex(ci => ci.menuItem.id === item.id && ci.selectedOption === selectedOption);
      if (existingIndex >= 0) {
        return prev.map((entry, index) => index === existingIndex ? { ...entry, quantity: Math.min(20, entry.quantity + 1) } : entry);
      }
      return [...prev, { id: crypto.randomUUID(), menuItem: item, quantity: 1, selectedOption }];
    });
    setToastNotification({ show: true, itemName: item.name });
  };

  const handleNavigate = (screen: ScreenType) => {
    setCurrentScreen(screen);
    setIsCartOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCustomerLogout = async () => {
    await api.logout().catch(() => undefined);
    setCurrentUser(null);
    handleNavigate('home');
  };

  const handleAdminLogin = (token: string) => {
    sessionStorage.setItem('tkk-admin-token', token);
    setAdminToken(token);
    handleNavigate('admin');
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('tkk-admin-token');
    setAdminToken('');
    handleNavigate('admin-login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c1322] text-[#dce2f8] selection:bg-[#ffb2ba] selection:text-[#670020] relative overflow-x-hidden">
      {!['admin', 'admin-login'].includes(currentScreen) && (
        <TopNavBar
          currentScreen={currentScreen}
          onNavigate={handleNavigate}
          cartCount={cartCount}
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAbout={() => setIsAboutOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          currentUser={currentUser}
          storeStatus={storeStatus}
        />
      )}

      <div className="flex-grow">
        {currentScreen === 'home' && (
          <main className="pt-24 pb-16 px-4 md:px-16 max-w-7xl mx-auto w-full">
            <HeroSection onNavigate={handleNavigate} storeStatus={storeStatus} />
            <LateNightHits onAddToCart={handleAddToCart} onNavigate={handleNavigate} />
          </main>
        )}
        {currentScreen === 'menu' && <MenuView onAddToCart={handleAddToCart} searchQuery={searchQuery} />}
        {currentScreen === 'checkout' && (
          <CheckoutView
            cartItems={cartItems}
            subtotal={subtotal}
            currentUser={currentUser}
            storeStatus={storeStatus}
            onPlaceOrder={order => {
              setLatestOrder(order);
              setCartItems([]);
              handleNavigate('confirmation');
            }}
            onNavigate={handleNavigate}
          />
        )}
        {currentScreen === 'confirmation' && (
          <OrderConfirmationView orderDetails={latestOrder} onNavigate={handleNavigate} />
        )}
        {currentScreen === 'login' && !authLoading && (
          <LoginView currentUser={currentUser} onAuthenticated={setCurrentUser} onLogout={handleCustomerLogout} onNavigate={handleNavigate} />
        )}
        {currentScreen === 'orders' && (
          <OrdersView onNavigate={handleNavigate} />
        )}
        {currentScreen === 'admin-login' && (
          <AdminLogin onLogin={handleAdminLogin} onBack={() => handleNavigate('home')} />
        )}
        {currentScreen === 'admin' && (
          adminToken
            ? <AdminDashboard token={adminToken} onLogout={handleAdminLogout} onBack={() => handleNavigate('home')} />
            : <AdminLogin onLogin={handleAdminLogin} onBack={() => handleNavigate('home')} />
        )}
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={(id, delta) => setCartItems(prev => prev
          .map(item => item.id === id ? { ...item, quantity: Math.min(20, item.quantity + delta) } : item)
          .filter(item => item.quantity > 0))}
        onRemoveItem={id => setCartItems(prev => prev.filter(item => item.id !== id))}
        subtotal={subtotal}
        onNavigate={handleNavigate}
      />
      <AddedToCartToast
        isOpen={toastNotification.show}
        itemName={toastNotification.itemName}
        cartCount={cartCount}
        subtotal={subtotal}
        onViewCart={() => { setToastNotification({ show: false, itemName: '' }); setIsCartOpen(true); }}
        onClose={() => setToastNotification({ show: false, itemName: '' })}
      />
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      {!['admin', 'admin-login'].includes(currentScreen) && (
        <Footer onNavigate={handleNavigate} onOpenAbout={() => setIsAboutOpen(true)} storeStatus={storeStatus} />
      )}
    </div>
  );
}



