/// <reference types="@cloudflare/workers-types" />

import { z } from 'zod';
import { MENU_ITEMS } from '../src/data/menuItems';
import { optionSurcharge } from '../src/pricing';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_URL: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  AUTH_SECRET: string;
  PASSWORD_PEPPER?: string;
  DELIVERY_PIN_CODES: string;
}

type OrderRow = {
  id: string; order_number: string; tracking_token: string; user_id: string | null;
  customer_json: string; fulfilment_json: string; items_json: string;
  subtotal: number; delivery_fee: number; packing_fee: number; total: number;
  payment_method: 'cod'; payment_status: string; status: string; notes: string | null;
  created_at: string; updated_at: string;
};

type UserRow = {
  id: string; email: string; password_hash: string; first_name: string; last_name: string;
  phone: string; street_address: string | null; apt_suite: string | null; zip_code: string | null;
  created_at: string; updated_at: string;
};

const CUSTOMER_COOKIE = '__Host-tkk_session';
const encoder = new TextEncoder();
const orderItemSchema = z.object({
  menuItemId: z.string().min(1).max(100),
  quantity: z.number().int().min(1).max(20),
  selectedOption: z.string().max(120).optional(),
});
const orderSchema = z.object({
  customer: z.object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(1).max(60),
    email: z.string().email().max(120),
    phone: z.string().trim().regex(/^[+]?[0-9 -]{10,16}$/),
  }),
  fulfilment: z.discriminatedUnion('type', [
    z.object({ type: z.literal('delivery'), streetAddress: z.string().trim().min(5).max(180), aptSuite: z.string().trim().max(100).optional(), zipCode: z.string().trim().regex(/^[0-9]{6}$/), instructions: z.string().trim().max(500).optional() }),
    z.object({ type: z.literal('pickup'), instructions: z.string().trim().max(500).optional() }),
  ]),
  paymentMethod: z.literal('cod'),
  items: z.array(orderItemSchema).min(1).max(50),
});
const passwordSchema = z.string().min(12).max(72).refine(value => encoder.encode(value).byteLength <= 72, 'Password is too long.');
const accountSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().email().max(120).transform(value => value.toLowerCase()),
  phone: z.string().trim().regex(/^[+]?[0-9 -]{10,16}$/),
  password: passwordSchema,
  streetAddress: z.string().trim().max(180).optional().default(''),
  aptSuite: z.string().trim().max(100).optional().default(''),
  zipCode: z.string().trim().regex(/^$|^[0-9]{6}$/).optional().default(''),
  rememberMe: z.boolean().optional().default(true),
});
const statusSchema = z.enum(['received', 'confirmed', 'cooking', 'ready', 'completed', 'cancelled']);

for (const item of MENU_ITEMS) for (const option of item.customOptions || []) optionSurcharge(option);

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) { super(message); }
}

function isStrongAdminPassword(value: string | undefined) {
  return Boolean(value && value.length >= 14 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value));
}
function configurationIssues(env: Env) {
  const issues: string[] = [];
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 64) issues.push('AUTH_SECRET');
  if (!env.PASSWORD_PEPPER || env.PASSWORD_PEPPER.length < 64) issues.push('PASSWORD_PEPPER');
  if (!env.ADMIN_EMAIL || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(env.ADMIN_EMAIL)) issues.push('ADMIN_EMAIL');
  if (!isStrongAdminPassword(env.ADMIN_PASSWORD)) issues.push('ADMIN_PASSWORD');
  const pinValues = (env.DELIVERY_PIN_CODES || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!pinValues.length || pinValues.some(value => !/^\d{6}$/.test(value))) issues.push('DELIVERY_PIN_CODES');
  return issues;
}
function passwordPepper(env: Env) {
  const value = env.PASSWORD_PEPPER;
  if (!value || value.length < 64) throw new ApiError(503, 'Account service is temporarily unavailable.');
  return value;
}
function requireAdminConfiguration(env: Env) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 64 || !env.ADMIN_EMAIL || !isStrongAdminPassword(env.ADMIN_PASSWORD)) {
    throw new ApiError(503, 'Admin service is temporarily unavailable.');
  }
}
function securityHeaders(requestId: string, api = true) {
  const headers = new Headers({
    'X-Request-Id': requestId,
    'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self' https://fonts.gstatic.com data:; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: https://images.unsplash.com https://lh3.googleusercontent.com; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; upgrade-insecure-requests",
  });
  if (api) headers.set('Cache-Control', 'no-store');
  return headers;
}

function json(data: unknown, status = 200, requestId: string = crypto.randomUUID(), extra?: HeadersInit) {
  const headers = securityHeaders(requestId);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  if (extra) new Headers(extra).forEach((value, key) => headers.set(key, value));
  return new Response(JSON.stringify(data), { status, headers });
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
function randomToken(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}
async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
}
async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}
function safeEqual(left: string, right: string) {
  const a = encoder.encode(left); const b = encoder.encode(right);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) diff |= (a[index % Math.max(a.length, 1)] || 0) ^ (b[index % Math.max(b.length, 1)] || 0);
  return diff === 0;
}
async function hashPassword(password: string, secret: string) {
  if (!secret || secret.length < 64) throw new ApiError(503, 'Account service is not configured yet.');
  const salt = randomToken(16);
  return `hmac-sha256$${salt}$${await hmac(`${salt}\0${password}`, secret)}`;
}
async function verifyPassword(password: string, stored: string, secret: string) {
  const [kind, first, second, third] = stored.split('$');
  if (kind === 'hmac-sha256' && first && second && secret?.length >= 64) {
    return safeEqual(await hmac(`${first}\0${password}`, secret), second);
  }
  if (kind !== 'pbkdf2' || !first || !second || !third) return false;
  const iterations = Number(first);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64UrlToBytes(second), iterations }, key, 256);
  return safeEqual(bytesToBase64Url(new Uint8Array(derived)), third);
}

async function parseBody(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 250_000) throw new ApiError(413, 'Request body is too large.');
  const text = await request.text();
  if (encoder.encode(text).byteLength > 250_000) throw new ApiError(413, 'Request body is too large.');
  try { return JSON.parse(text || '{}'); } catch { throw new ApiError(400, 'Invalid JSON request body.'); }
}
function cookieValue(request: Request, name: string) {
  for (const cookie of (request.headers.get('cookie') || '').split(';')) {
    const [key, ...parts] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return '';
}
function clientAddress(request: Request) {
  return request.headers.get('cf-connecting-ip') || 'unknown';
}
async function enforceRateLimit(env: Env, request: Request, scope: string, limit: number, windowSeconds: number) {
  const now = Math.floor(Date.now() / 1000);
  const bucket = Math.floor(now / windowSeconds);
  const key = `${scope}:${clientAddress(request)}:${bucket}`;
  await env.DB.prepare(`INSERT INTO rate_limits (key, count, expires_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET count = count + 1`).bind(key, (bucket + 2) * windowSeconds).run();
  const row = await env.DB.prepare('SELECT count FROM rate_limits WHERE key = ?').bind(key).first<{ count: number }>();
  if ((row?.count || 0) > limit) throw new ApiError(429, 'Too many requests. Please try again later.');
}
function assertSameOrigin(request: Request, env: Env) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  if (request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'Cross-site request blocked.');
  const origin = request.headers.get('origin');
  if (!origin) return;
  const requestOrigin = new URL(request.url).origin;
  let configured = requestOrigin;
  try { configured = new URL(env.APP_URL).origin; } catch { /* validated during deploy */ }
  if (origin !== requestOrigin && origin !== configured) throw new ApiError(403, 'Cross-site request blocked.');
}
function publicUser(user: UserRow) {
  return { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, name: `${user.first_name} ${user.last_name}`.trim(), phone: user.phone, streetAddress: user.street_address || '', aptSuite: user.apt_suite || '', zipCode: user.zip_code || '' };
}
function mapOrder(row: OrderRow, includePrivate = false) {
  const order = { id: row.id, orderNumber: row.order_number, items: JSON.parse(row.items_json), subtotal: row.subtotal, deliveryFee: row.delivery_fee, packingFee: row.packing_fee, total: row.total, paymentMethod: row.payment_method, paymentStatus: row.payment_status, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, estimatedMinutes: row.status === 'ready' ? 0 : 25, fulfilment: { type: JSON.parse(row.fulfilment_json).type } };
  return includePrivate ? { ...order, trackingToken: row.tracking_token, customer: JSON.parse(row.customer_json), fulfilment: JSON.parse(row.fulfilment_json) } : order;
}
async function sessionUser(request: Request, env: Env) {
  const token = cookieValue(request, CUSTOMER_COOKIE);
  if (!token) return undefined;
  return env.DB.prepare(`SELECT users.* FROM customer_sessions JOIN users ON users.id = customer_sessions.user_id WHERE customer_sessions.token_hash = ? AND customer_sessions.expires_at > ?`)
    .bind(await sha256(token), new Date().toISOString()).first<UserRow>();
}
async function issueCustomerSession(env: Env, userId: string, rememberMe: boolean) {
  const token = randomToken(32);
  const lifetimeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  const now = new Date();
  await env.DB.prepare('INSERT INTO customer_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)').bind(await sha256(token), userId, new Date(now.getTime() + lifetimeMs).toISOString(), now.toISOString()).run();
  return `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax${rememberMe ? `; Max-Age=${Math.floor(lifetimeMs / 1000)}` : ''}`;
}
async function createAdminToken(env: Env) {
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ sub: env.ADMIN_EMAIL.toLowerCase(), role: 'admin', iat: Date.now(), exp: Date.now() + 4 * 60 * 60 * 1000 })));
  return `${payload}.${await hmac(payload, env.AUTH_SECRET)}`;
}
async function requireAdmin(request: Request, env: Env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) throw new ApiError(401, 'Admin authentication required.');
  if (!safeEqual(signature, await hmac(payload, env.AUTH_SECRET))) throw new ApiError(401, 'Invalid session.');
  try {
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    if (decoded.role !== 'admin' || decoded.sub !== env.ADMIN_EMAIL.toLowerCase() || decoded.exp < Date.now()) throw new Error('Expired');
  } catch { throw new ApiError(401, 'Session expired. Please sign in again.'); }
}
function calculateOrder(input: z.infer<typeof orderSchema>) {
  const catalog = new Map(MENU_ITEMS.map(item => [item.id, item]));
  const items = input.items.map(requested => {
    const menuItem = catalog.get(requested.menuItemId);
    if (!menuItem) throw new ApiError(400, 'An item in your cart is no longer available.');
    if (requested.selectedOption && !menuItem.customOptions?.includes(requested.selectedOption)) throw new ApiError(400, 'A selected item option is no longer available.');
    const unitPrice = menuItem.price + optionSurcharge(requested.selectedOption);
    return { menuItemId: menuItem.id, name: menuItem.name, isNonVeg: Boolean(menuItem.isNonVeg), selectedOption: requested.selectedOption, quantity: requested.quantity, unitPrice, lineTotal: unitPrice * requested.quantity };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = 0;
  const packingFee = 0;
  const total = subtotal;
  if (total > 25_000) throw new ApiError(400, 'Orders above ₹25,000 must be placed directly with the kitchen.');
  return { items, subtotal, deliveryFee, packingFee, total };
}

async function handleApi(request: Request, env: Env, requestId: string) {
  assertSameOrigin(request, env);
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'GET' && path === '/api/health') {
    await env.DB.prepare('SELECT 1').first();
    const issues = configurationIssues(env);
    return json({ ok: issues.length === 0, mode: 'cod', platform: 'cloudflare', configuration: issues.length ? 'incomplete' : 'ready', missing: issues }, issues.length ? 503 : 200, requestId);
  }
  if (request.method === 'POST' && path === '/api/auth/register') {
    await enforceRateLimit(env, request, 'register', 5, 3600);
    const parsed = accountSchema.safeParse(await parseBody(request));
    if (!parsed.success) throw new ApiError(400, 'Please check your account details.', parsed.error.flatten());
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(parsed.data.email).first();
    if (existing) throw new ApiError(409, 'An account with this email already exists.');
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    await env.DB.prepare(`INSERT INTO users (id, email, password_hash, first_name, last_name, phone, street_address, apt_suite, zip_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, parsed.data.email, await hashPassword(parsed.data.password, passwordPepper(env)), parsed.data.firstName, parsed.data.lastName, parsed.data.phone, parsed.data.streetAddress, parsed.data.aptSuite, parsed.data.zipCode, now, now).run();
    const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<UserRow>();
    return json({ user: publicUser(user!) }, 201, requestId, { 'Set-Cookie': await issueCustomerSession(env, id, parsed.data.rememberMe) });
  }
  if (request.method === 'POST' && path === '/api/auth/login') {
    await enforceRateLimit(env, request, 'customer-login', 10, 900);
    const parsed = z.object({ email: z.string().trim().email().max(120), password: z.string().min(1).max(72), rememberMe: z.boolean().optional().default(true) }).safeParse(await parseBody(request));
    if (!parsed.success) throw new ApiError(400, 'Enter a valid email and password.');
    const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(parsed.data.email.toLowerCase()).first<UserRow>();
    if (!user || !(await verifyPassword(parsed.data.password, user.password_hash, passwordPepper(env)))) throw new ApiError(401, 'Invalid email or password.');
    await env.DB.prepare('DELETE FROM customer_sessions WHERE expires_at <= ?').bind(new Date().toISOString()).run();
    return json({ user: publicUser(user) }, 200, requestId, { 'Set-Cookie': await issueCustomerSession(env, user.id, parsed.data.rememberMe) });
  }
  if (request.method === 'GET' && path === '/api/auth/me') {
    const user = await sessionUser(request, env);
    return json({ user: user ? publicUser(user) : null }, 200, requestId);
  }
  if (request.method === 'POST' && path === '/api/auth/logout') {
    const token = cookieValue(request, CUSTOMER_COOKIE);
    if (token) await env.DB.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return json({ ok: true }, 200, requestId, { 'Set-Cookie': `${CUSTOMER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }
  if (request.method === 'GET' && path === '/api/account/orders') {
    const user = await sessionUser(request, env);
    if (!user) throw new ApiError(401, 'Please sign in to continue.');
    const result = await env.DB.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user.id).all<OrderRow>();
    return json({ orders: result.results.map(row => mapOrder(row, true)) }, 200, requestId);
  }
  if (request.method === 'POST' && path === '/api/orders') {
    await enforceRateLimit(env, request, 'orders', 12, 900);
    const parsed = orderSchema.safeParse(await parseBody(request));
    if (!parsed.success) throw new ApiError(400, 'Please check your order details.', parsed.error.flatten());
    const deliveryPinValues = (env.DELIVERY_PIN_CODES || '').split(',').map(value => value.trim()).filter(Boolean);
    const deliveryPins = new Set(deliveryPinValues.filter(value => /^\d{6}$/.test(value)));
    if (parsed.data.fulfilment.type === 'delivery' && deliveryPins.size === 0) throw new ApiError(503, 'Delivery ordering is temporarily unavailable. Please choose pickup.');
    if (parsed.data.fulfilment.type === 'delivery' && !deliveryPins.has(parsed.data.fulfilment.zipCode)) throw new ApiError(400, 'Delivery is not available for this PIN code yet.');
    const calculated = calculateOrder(parsed.data); const user = await sessionUser(request, env);
    const id = crypto.randomUUID(); const trackingToken = randomToken(24); const now = new Date().toISOString();
    const orderNumber = `TKK-${now.slice(2, 10).replace(/-/g, '')}-${randomToken(5).replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase()}`;
    await env.DB.prepare(`INSERT INTO orders (id, order_number, tracking_token, customer_json, fulfilment_json, items_json, subtotal, delivery_fee, packing_fee, total, payment_method, payment_status, status, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, orderNumber, trackingToken, JSON.stringify(parsed.data.customer), JSON.stringify(parsed.data.fulfilment), JSON.stringify(calculated.items), calculated.subtotal, calculated.deliveryFee, calculated.packingFee, calculated.total, 'cod', 'cod_pending', 'received', user?.id || null, now, now).run();
    const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
    return json({ order: { ...mapOrder(row!), trackingToken } }, 201, requestId);
  }
  const trackingMatch = path.match(/^\/api\/orders\/([^/]+)$/);
  if (request.method === 'GET' && trackingMatch) {
    await enforceRateLimit(env, request, 'tracking', 60, 900);
    const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(decodeURIComponent(trackingMatch[1])).first<OrderRow>();
    if (!row || !safeEqual(url.searchParams.get('token') || '', row.tracking_token)) throw new ApiError(404, 'Order not found.');
    return json({ order: mapOrder(row) }, 200, requestId);
  }
  if (request.method === 'POST' && path === '/api/admin/login') {
    requireAdminConfiguration(env);
    await enforceRateLimit(env, request, 'admin-login', 8, 900);
    const parsed = z.object({ email: z.string().email(), password: z.string().min(8).max(200) }).safeParse(await parseBody(request));
    if (!parsed.success) throw new ApiError(400, 'Enter a valid email and password.');
    const emailMatches = safeEqual(parsed.data.email.toLowerCase(), env.ADMIN_EMAIL.toLowerCase());
    const [actualPasswordMac, expectedPasswordMac] = await Promise.all([hmac(parsed.data.password, env.AUTH_SECRET), hmac(env.ADMIN_PASSWORD, env.AUTH_SECRET)]);
    if (!emailMatches || !safeEqual(actualPasswordMac, expectedPasswordMac)) throw new ApiError(401, 'Invalid admin credentials.');
    return json({ token: await createAdminToken(env), admin: { email: env.ADMIN_EMAIL.toLowerCase() } }, 200, requestId);
  }
  if (request.method === 'GET' && path === '/api/admin/orders') {
    await requireAdmin(request, env);
    const status = url.searchParams.get('status') || 'active';
    const requestedPage = Number(url.searchParams.get('page') || '1');
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    let result: D1Result<OrderRow>;
    let count: { count: number } | null;
    if (status === 'all') {
      [result, count] = await Promise.all([
        env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(limit, offset).all<OrderRow>(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM orders').first<{ count: number }>(),
      ]);
    } else if (status === 'active') {
      [result, count] = await Promise.all([
        env.DB.prepare("SELECT * FROM orders WHERE status IN ('received', 'confirmed', 'cooking', 'ready') ORDER BY created_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all<OrderRow>(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE status IN ('received', 'confirmed', 'cooking', 'ready')").first<{ count: number }>(),
      ]);
    } else if (status === 'history') {
      [result, count] = await Promise.all([
        env.DB.prepare("SELECT * FROM orders WHERE status IN ('completed', 'cancelled') ORDER BY updated_at DESC LIMIT ? OFFSET ?").bind(limit, offset).all<OrderRow>(),
        env.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE status IN ('completed', 'cancelled')").first<{ count: number }>(),
      ]);
    } else {
      const parsedStatus = statusSchema.safeParse(status);
      if (!parsedStatus.success) throw new ApiError(400, 'Invalid order status filter.');
      [result, count] = await Promise.all([
        env.DB.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(parsedStatus.data, limit, offset).all<OrderRow>(),
        env.DB.prepare('SELECT COUNT(*) AS count FROM orders WHERE status = ?').bind(parsedStatus.data).first<{ count: number }>(),
      ]);
    }
    const total = Number(count?.count || 0);
    return json({ orders: result.results.map(row => mapOrder(row, true)), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } }, 200, requestId);
  }
  const adminStatusMatch = path.match(/^\/api\/admin\/orders\/([^/]+)\/status$/);
  if (request.method === 'PATCH' && adminStatusMatch) {
    await requireAdmin(request, env);
    const parsed = z.object({ status: statusSchema }).safeParse(await parseBody(request));
    if (!parsed.success) throw new ApiError(400, 'Invalid order status.');
    const id = decodeURIComponent(adminStatusMatch[1]); const now = new Date().toISOString();
    const result = await env.DB.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').bind(parsed.data.status, now, id).run();
    if (!result.meta.changes) throw new ApiError(404, 'Order not found.');
    const row = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first<OrderRow>();
    return json({ order: mapOrder(row!, true) }, 200, requestId);
  }
  if (request.method === 'GET' && path === '/api/admin/summary') {
    await requireAdmin(request, env);
    const [statuses, today] = await Promise.all([
      env.DB.prepare('SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders GROUP BY status').all<{ status: string; count: number; revenue: number }>(),
      env.DB.prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE substr(created_at, 1, 10) = ? AND status != 'cancelled'`).bind(new Date().toISOString().slice(0, 10)).first<{ count: number; revenue: number }>(),
    ]);
    return json({ byStatus: statuses.results, today }, 200, requestId);
  }
  throw new ApiError(404, 'API endpoint not found.');
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const supplied = request.headers.get('x-request-id') || '';
    const requestId = /^[A-Za-z0-9._-]{8,80}$/.test(supplied) ? supplied : crypto.randomUUID();
    try {
      if (!new URL(request.url).pathname.startsWith('/api/')) {
        const asset = await env.ASSETS.fetch(request);
        const headers = new Headers(asset.headers);
        const additions = securityHeaders(requestId, false);
        additions.forEach((value, key) => headers.set(key, value));
        return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
      }
      if (Math.random() < 0.01) ctx.waitUntil(env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(Math.floor(Date.now() / 1000)).run().then(() => undefined));
      return await handleApi(request, env, requestId);
    } catch (error) {
      if (error instanceof ApiError) return json({ error: error.message, ...(error.details ? { details: error.details } : {}) }, error.status, requestId);
      console.error('Unhandled request error', { requestId, error });
      return json({ error: 'Unexpected server error.', requestId }, 500, requestId);
    }
  },
} satisfies ExportedHandler<Env>;
