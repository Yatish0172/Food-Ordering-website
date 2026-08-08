import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const port = 3210 + (process.pid % 300);
const base = 'http://127.0.0.1:' + port;
const tempDir = path.join(root, '.tmp', 'security-smoke-' + process.pid);
const adminEmail = 'security-audit@example.test';
const adminPassword = 'Test-Admin-2026!';
const checks = [];
let output = '';

function pass(name) {
  checks.push(name);
  process.stdout.write('PASS ' + name + '\n');
}

async function call(urlPath, init = {}) {
  const response = await fetch(base + urlPath, init);
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const result = await fetch(base + '/api/health');
      if (result.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Server did not become healthy. ' + output);
}

await fs.mkdir(tempDir, { recursive: true });
const child = spawn(process.execPath, ['dist-server/index.js'], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(port),
    DATA_DIR: tempDir,
    APP_URL: base,
    TRUST_PROXY_HOPS: '0',
    ADMIN_EMAIL: adminEmail,
    ADMIN_PASSWORD: adminPassword,
    AUTH_SECRET: 'a'.repeat(96),
    DELIVERY_PIN_CODES: '560001',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });

try {
  await waitForServer();

  let result = await call('/api/health');
  assert.deepEqual(result.body, { ok: true, mode: 'cod' });
  pass('COD health response');
  const homeResponse = await fetch(base + '/');
  assert.equal(homeResponse.status, 200);
  assert.match(homeResponse.headers.get('content-type') || '', /text\/html/);
  const homeHtml = await homeResponse.text();
  const assetPaths = [...homeHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => match[1]);
  assert.ok(assetPaths.length >= 2);
  for (const assetPath of assetPaths) assert.equal((await fetch(base + assetPath)).status, 200);
  pass('production homepage and hashed assets');

  const robotsResponse = await fetch(base + '/robots.txt');
  assert.equal(robotsResponse.status, 200);
  assert.match(await robotsResponse.text(), /Disallow: \/api\//);
  pass('robots policy served');

  assert.match(result.response.headers.get('content-security-policy') || '', /default-src 'self'/);
  pass('Content Security Policy');
  assert.equal(result.response.headers.get('x-frame-options'), 'DENY');
  pass('anti-framing header');
  assert.match(result.response.headers.get('permissions-policy') || '', /payment=\(\)/);
  pass('Permissions Policy');
  assert.equal(result.response.headers.get('x-powered-by'), null);
  pass('technology header hidden');
  assert.equal(result.response.headers.get('cache-control'), 'no-store');
  pass('API responses are not cached');
  result = await call('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Test',
      lastName: 'Customer',
      email: 'customer@example.test',
      phone: '9999999998',
      password: 'Customer-2026!',
      rememberMe: true,
    }),
  });
  assert.equal(result.response.status, 201);
  const setCookie = result.response.headers.get('set-cookie') || '';
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const customerCookie = setCookie.split(';')[0];
  pass('customer registration and protected cookie');

  result = await call('/api/auth/me', { headers: { Cookie: customerCookie } });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.user.email, 'customer@example.test');
  pass('customer session lookup');

  result = await call('/api/auth/logout', { method: 'POST', headers: { Cookie: customerCookie } });
  assert.equal(result.response.status, 200);
  pass('customer logout');

  result = await call('/api/not-a-real-route');
  assert.equal(result.response.status, 404);
  assert.equal(result.body.error, 'API endpoint not found.');
  pass('unknown API JSON 404');

  result = await call('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert.equal(result.response.status, 403);
  pass('cross-site write blocked');

  result = await call('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Test', lastName: 'Guest', email: 'guest@example.test', phone: '9999999999' },
      fulfilment: { type: 'pickup', instructions: '' },
      paymentMethod: 'razorpay',
      items: [{ menuItemId: 'cold-coffee', quantity: 1 }],
    }),
  });
  assert.equal(result.response.status, 400);
  pass('non-COD payment rejected');

  result = await call('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Test', lastName: 'Guest', email: 'guest@example.test', phone: '9999999999' },
      fulfilment: { type: 'pickup', instructions: '' },
      paymentMethod: 'cod',
      items: [{ menuItemId: 'not-in-catalog', quantity: 1 }],
    }),
  });
  assert.equal(result.response.status, 400);
  assert.equal(result.body.error, 'An item in your cart is no longer available.');
  pass('unknown catalog item is controlled 400');
  result = await call('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Test', lastName: 'Guest', email: 'guest@example.test', phone: '9999999999' },
      fulfilment: { type: 'delivery', streetAddress: '1 Test Street', zipCode: '999999', instructions: '' },
      paymentMethod: 'cod',
      items: [{ menuItemId: 'cold-coffee', quantity: 1 }],
    }),
  });
  assert.equal(result.response.status, 400);
  assert.match(result.body.error, /Delivery is not available/);
  pass('delivery service area enforced');

  result = await call('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: { firstName: 'Test', lastName: 'Guest', email: 'guest@example.test', phone: '9999999999' },
      fulfilment: { type: 'pickup', instructions: '' },
      paymentMethod: 'cod',
      items: [{ menuItemId: 'cold-coffee', quantity: 1, selectedOption: 'Add Ice-Cream Scoop (+ ₹20)' }],
    }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.order.subtotal, 119);
  assert.equal(result.body.order.total, 139);
  assert.equal(result.body.order.items[0].unitPrice, 119);
  const order = result.body.order;
  pass('custom option priced server-side');

  result = await call('/api/orders/' + order.id + '?token=wrong');
  assert.equal(result.response.status, 404);
  pass('tracking token required');
  result = await call('/api/orders/' + order.id + '?token=' + encodeURIComponent(order.trackingToken));
  assert.equal(result.response.status, 200);
  assert.equal('customer' in result.body.order, false);
  pass('public tracking excludes PII');

  result = await call('/api/admin/orders');
  assert.equal(result.response.status, 401);
  pass('admin route protected');

  result = await call('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  assert.equal(result.response.status, 200);
  const token = result.body.token;
  pass('admin login');

  result = await call('/api/admin/orders/' + order.id + '/status', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ status: 'cooking' }),
  });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.order.status, 'cooking');
  pass('admin status update');

  for (let attempt = 0; attempt < 9; attempt += 1) {
    result = await call('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '203.0.113.' + attempt },
      body: JSON.stringify({ email: adminEmail, password: 'Wrong-Password-1!' }),
    });
  }
  assert.equal(result.response.status, 429);
  pass('spoofed forwarding header cannot bypass local rate limit');

  const malformed = await fetch(base + '/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(malformed.status, 400);
  assert.match(malformed.headers.get('content-type') || '', /application\/json/);
  pass('malformed JSON has controlled response');
  for (let attempt = 0; attempt < 9; attempt += 1) {
    result = await call('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.' + attempt },
      body: JSON.stringify({
        customer: { firstName: 'Test', lastName: 'Guest', email: 'guest@example.test', phone: '9999999999' },
        fulfilment: { type: 'pickup', instructions: '' },
        paymentMethod: 'cod',
        items: [{ menuItemId: 'not-in-catalog', quantity: 1 }],
      }),
    });
  }
  assert.equal(result.response.status, 429);
  pass('public order creation is rate limited');

  const guardDir = path.join(tempDir, 'guard');
  const guard = spawn(process.execPath, ['dist-server/index.js'], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port + 1),
      DATA_DIR: guardDir,
      APP_URL: 'http://insecure.example',
      TRUST_PROXY_HOPS: '0',
      ADMIN_EMAIL: 'admin@example.test',
      ADMIN_PASSWORD: 'weak',
      AUTH_SECRET: 'short',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let guardOutput = '';
  guard.stderr.on('data', chunk => { guardOutput += chunk; });
  guard.stdout.on('data', chunk => { guardOutput += chunk; });
  const [guardCode] = await once(guard, 'exit');
  assert.notEqual(guardCode, 0);
  assert.match(guardOutput, /Production configuration missing/);
  pass('unsafe production configuration refuses to boot');

  process.stdout.write('\n' + checks.length + ' security and COD smoke checks passed.\n');
} finally {
  child.kill();
  await Promise.race([once(child, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]).catch(() => undefined);
  await fs.rm(tempDir, { recursive: true, force: true });
}