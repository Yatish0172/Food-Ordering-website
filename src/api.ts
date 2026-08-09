import type { CartItem, OrderRecord, PaymentMethod, User } from './types';
import type { StoreStatus } from './storeHours';

const API_ROOT = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API_ROOT + path, {
    credentials: 'same-origin',
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
  return payload;
}

export type CheckoutPayload = {
  customer: { firstName: string; lastName: string; email: string; phone: string };
  fulfilment:
    | { type: 'delivery'; streetAddress: string; aptSuite?: string; zipCode: string; instructions?: string }
    | { type: 'pickup'; instructions?: string };
  paymentMethod: PaymentMethod;
  items: Array<{ menuItemId: string; quantity: number; selectedOption?: string }>;
};

export type AccountPayload = {
  firstName: string; lastName: string; email: string; phone: string; password: string;
  streetAddress?: string; aptSuite?: string; zipCode?: string; rememberMe?: boolean;
};

export type CreateOrderResponse = {
  order: OrderRecord & { trackingToken: string };
};

export const api = {
  health: () => request<{ ok: boolean; mode: 'cod'; store: StoreStatus }>('/health'),
  storeStatus: () => request<{ store: StoreStatus }>('/store-status'),
  register: (payload: AccountPayload) => request<{ user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (email: string, password: string, rememberMe: boolean) => request<{ user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password, rememberMe }) }),
  me: () => request<{ user: User | null }>('/auth/me'),
  logout: () => request<{ ok: true }>('/auth/logout', { method: 'POST' }),
  myOrders: () => request<{ orders: OrderRecord[] }>('/account/orders'),
  createOrder: (payload: CheckoutPayload) => request<CreateOrderResponse>('/orders', { method: 'POST', body: JSON.stringify(payload) }),
  getOrder: (id: string, token: string) => request<{ order: OrderRecord }>('/orders/' + id + '?token=' + encodeURIComponent(token)),
  adminLogin: (email: string, password: string) => request<{ token: string; admin: { email: string } }>('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  adminOrders: (token: string, status = 'active', page = 1) => request<{ orders: OrderRecord[]; pagination: { page: number; limit: number; total: number; pages: number } }>('/admin/orders?status=' + encodeURIComponent(status) + '&page=' + page, { headers: { Authorization: 'Bearer ' + token } }),
  adminSummary: (token: string) => request<{ today: { count: number; revenue: number }; byStatus: Array<{ status: string; count: number; revenue: number }> }>('/admin/summary', { headers: { Authorization: 'Bearer ' + token } }),
  updateOrderStatus: (token: string, id: string, status: string) => request<{ order: OrderRecord }>('/admin/orders/' + id + '/status', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token }, body: JSON.stringify({ status }) }),
};

export function serializeCart(cartItems: CartItem[]) {
  return cartItems.map(item => ({ menuItemId: item.menuItem.id, quantity: item.quantity, selectedOption: item.selectedOption }));
}

