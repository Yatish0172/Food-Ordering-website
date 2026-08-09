import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const baseUrl = 'http://localhost:8787';
const command = process.execPath;
const wrangler = 'node_modules/wrangler/bin/wrangler.js';
const vars = [
  'APP_URL=http://localhost:8787',
  'ADMIN_EMAIL=admin-test@karaokekitchen.co.in',
  'ADMIN_PASSWORD=CloudflareTest2026-Strong',
  'AUTH_SECRET=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  'PASSWORD_PEPPER=abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  'ENVIRONMENT=test',
  'STORE_TEST_NOW=2026-08-10T06:30:00.000Z',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}
async function api(path, init = {}) {
  const response = await fetch(baseUrl + path, init);
  const payload = await response.json().catch(() => ({}));
  return { response, payload };
}
async function waitForWorker(child) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (child.exitCode !== null) throw new Error(`Wrangler exited early with code ${child.exitCode}.`);
    try {
      const response = await fetch(baseUrl + '/api/health');
      if (response.status > 0) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Worker did not become ready.');
}

const bindingArgs = vars.flatMap(binding => { const separator = binding.indexOf('='); return ['--var', binding.slice(0, separator) + ':' + binding.slice(separator + 1)]; });
const child = spawn(command, [wrangler, 'dev', '--port', '8787', ...bindingArgs], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });

try {
  await waitForWorker(child);
  const home = await fetch(baseUrl + '/');
  assert(home.ok, 'storefront responds');
  assert(home.headers.get('content-security-policy')?.includes("default-src 'self'"), 'storefront has CSP');
  assert(home.headers.get('strict-transport-security')?.includes('max-age='), 'storefront has HSTS');

  const health = await api('/api/health');
  assert(health.response.status === 200 && health.payload.ok && health.payload.configuration === 'ready', 'health reports ready: ' + JSON.stringify(health.payload));

  const email = `worker-smoke-${Date.now()}@example.com`;
  const registration = await api('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ firstName: 'Smoke', lastName: 'Test', email, phone: '9999999999', password: 'Customer@Test2026!', rememberMe: true }) });
  assert(registration.response.status === 201 && registration.payload.user.email === email, 'customer registration');
  const cookie = registration.response.headers.get('set-cookie')?.split(';')[0];
  assert(Boolean(cookie), 'secure customer session issued');

  const me = await api('/api/auth/me', { headers: { Cookie: cookie } });
  assert(me.response.status === 200 && me.payload.user.email === email, 'customer session lookup');

  const rejectedPayment = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: { firstName: 'Smoke', lastName: 'Test', email, phone: '9999999999' }, fulfilment: { type: 'pickup' }, paymentMethod: 'card', items: [{ menuItemId: 'cutting-chai', quantity: 1 }] }) });
  assert(rejectedPayment.response.status === 400, 'non-COD payment rejected');

  const order = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ customer: { firstName: 'Smoke', lastName: 'Test', email, phone: '9999999999' }, fulfilment: { type: 'pickup' }, paymentMethod: 'cod', items: [{ menuItemId: 'cutting-chai', quantity: 2 }] }) });
  assert(order.response.status === 201 && order.payload.order.trackingToken, 'COD order created');
  assert(order.payload.order.deliveryFee === 0 && order.payload.order.packingFee === 0 && order.payload.order.total === order.payload.order.subtotal, 'delivery and packing charges stay zero');

  const tracking = await api(`/api/orders/${order.payload.order.id}?token=${encodeURIComponent(order.payload.order.trackingToken)}`);
  assert(tracking.response.status === 200 && tracking.payload.order.id === order.payload.order.id, 'private tracking works');
  assert(!tracking.payload.order.customer, 'public tracking excludes PII');

  const admin = await api('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin-test@karaokekitchen.co.in', password: 'CloudflareTest2026-Strong' }) });
  assert(admin.response.status === 200 && admin.payload.token, 'admin login');
  const updated = await api(`/api/admin/orders/${order.payload.order.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.payload.token}` }, body: JSON.stringify({ status: 'confirmed' }) });
  assert(updated.response.status === 200 && updated.payload.order.status === 'confirmed', 'admin status update');
  const completed = await api(`/api/admin/orders/${order.payload.order.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.payload.token}` }, body: JSON.stringify({ status: 'completed' }) });
  assert(completed.response.status === 200 && completed.payload.order.status === 'completed', 'completed order archived');
  const history = await api('/api/admin/orders?status=history&page=1', { headers: { Authorization: `Bearer ${admin.payload.token}` } });
  assert(history.response.status === 200 && history.payload.orders.some(entry => entry.id === order.payload.order.id) && history.payload.pagination.total >= 1, 'paginated order history retains completed orders');
  const activeOrders = await api('/api/admin/orders?status=active&page=1', { headers: { Authorization: `Bearer ${admin.payload.token}` } });
  assert(activeOrders.response.status === 200 && !activeOrders.payload.orders.some(entry => entry.id === order.payload.order.id), 'completed orders leave active queue');

  const badPin = await api('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: { firstName: 'Smoke', lastName: 'Test', email, phone: '9999999999' }, fulfilment: { type: 'delivery', streetAddress: 'A complete test address', zipCode: '999999' }, paymentMethod: 'cod', items: [{ menuItemId: 'cutting-chai', quantity: 1 }] }) });
  assert(badPin.response.status === 201, 'delivery PIN accepted without service-area restriction');
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}
