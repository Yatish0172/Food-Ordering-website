import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderConfirmationView } from '../src/components/OrderConfirmationView';
import type { OrderRecord } from '../src/types';

const order: OrderRecord = {
  id: 'order-1',
  orderNumber: 'TKK-TEST-1',
  trackingToken: 'tracking-token',
  customer: { firstName: 'Test', lastName: 'Customer', email: 'test@example.com', phone: '9999999999' },
  fulfilment: { type: 'pickup' },
  items: [{ menuItemId: 'cutting-chai', name: 'Cutting Chai', isNonVeg: false, quantity: 1, unitPrice: 15, lineTotal: 15 }],
  subtotal: 15,
  deliveryFee: 0,
  packingFee: 0,
  total: 15,
  paymentMethod: 'cod',
  paymentStatus: 'cancelled',
  status: 'cancelled',
  createdAt: '2026-08-10T06:00:00.000Z',
  updatedAt: '2026-08-10T06:05:00.000Z',
  estimatedMinutes: 25,
};

const cancelled = renderToStaticMarkup(<OrderConfirmationView orderDetails={order} onNavigate={() => undefined} />);
assert.match(cancelled, /Order cancelled\./);
assert.match(cancelled, /No payment is due/);
assert.doesNotMatch(cancelled, /Your order is live/);
assert.doesNotMatch(cancelled, />received</);

const active = renderToStaticMarkup(<OrderConfirmationView orderDetails={{ ...order, status: 'cooking', paymentStatus: 'cod_pending' }} onNavigate={() => undefined} />);
assert.match(active, /Your order is live\./);
assert.match(active, />cooking</);

console.log('PASS order confirmation status rendering');
