export type ScreenType = 'home' | 'menu' | 'checkout' | 'confirmation' | 'login' | 'orders' | 'admin-login' | 'admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  streetAddress: string;
  aptSuite: string;
  zipCode: string;
}

export type GroupCategory =
  | 'All'
  | 'Beverages & Refreshers'
  | 'Shakes & Mocktails'
  | 'Starters & Snacks'
  | 'Fast Food & Pizzas'
  | 'Maggi & Noodles'
  | 'Main Course & Combos'
  | 'Rice, Biryani & Breads'
  | 'Sweets & Desserts';

export interface MenuItem {
  id: string; name: string; description?: string; price: number;
  groupCategory: GroupCategory; subCategory: string; isNonVeg?: boolean;
  image?: string; tag?: string; customOptions?: string[];
}

export interface CartItem {
  id: string; menuItem: MenuItem; quantity: number; selectedOption?: string;
}

export type PaymentMethod = 'cod';
export type OrderStatus = 'pending_payment' | 'received' | 'confirmed' | 'cooking' | 'ready' | 'completed' | 'cancelled';

export interface OrderLine {
  menuItemId: string; name: string; isNonVeg: boolean; selectedOption?: string;
  quantity: number; unitPrice: number; lineTotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  trackingToken?: string;
  customer?: { firstName: string; lastName: string; email: string; phone: string };
  fulfilment?: {
    type: 'delivery' | 'pickup'; streetAddress?: string; aptSuite?: string;
    zipCode?: string; instructions?: string;
  };
  items: OrderLine[];
  subtotal: number; deliveryFee: number; packingFee: number; total: number;
  paymentMethod: PaymentMethod; paymentStatus: string; status: OrderStatus;
  createdAt: string; updatedAt: string; estimatedMinutes: number;
}

export type OrderDetails = OrderRecord;

