import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MENU_ITEMS } from '../src/data/menuItems';
import { optionSurcharge } from '../src/pricing';
import { getStoreStatus } from '../src/storeHours';

dotenv.config({ path: '.env.local', override: false });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(rootDir, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const PORT = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@karaokekitchen.in').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Karaoke@2026';
const AUTH_SECRET = process.env.AUTH_SECRET || 'local-development-secret-change-before-production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const TRUST_PROXY_HOPS = Number(process.env.TRUST_PROXY_HOPS || (isProduction ? 1 : 0));
const currentStoreStatus = () => {
  const testDate = !isProduction && process.env.STORE_TEST_NOW ? new Date(process.env.STORE_TEST_NOW) : undefined;
  return getStoreStatus(testDate && !Number.isNaN(testDate.getTime()) ? testDate : new Date());
};

if (!Number.isInteger(TRUST_PROXY_HOPS) || TRUST_PROXY_HOPS < 0 || TRUST_PROXY_HOPS > 3) {
  throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 3.');
}
if (isProduction) {
  const strongPassword = ADMIN_PASSWORD.length >= 14
    && /[a-z]/.test(ADMIN_PASSWORD) && /[A-Z]/.test(ADMIN_PASSWORD)
    && /\d/.test(ADMIN_PASSWORD) && /[^A-Za-z0-9]/.test(ADMIN_PASSWORD);
  let secureAppUrl = false;
  try { secureAppUrl = new URL(APP_URL).protocol === 'https:'; } catch { secureAppUrl = false; }
  const missing = [
    !process.env.ADMIN_EMAIL && 'ADMIN_EMAIL',
    !process.env.ADMIN_PASSWORD && 'ADMIN_PASSWORD',
    !strongPassword && 'strong ADMIN_PASSWORD (14+ characters with upper, lower, number, and symbol)',
    (!process.env.AUTH_SECRET || AUTH_SECRET.length < 64) && 'AUTH_SECRET (64+ random characters)',
    !process.env.DATA_DIR && 'DATA_DIR (persistent volume path)',
    !process.env.APP_URL && 'APP_URL',

    !secureAppUrl && 'HTTPS APP_URL',
  ].filter(Boolean);
  if (missing.length) throw new Error('Production configuration missing: ' + missing.join(', '));
}

const databasePath = path.join(dataDir, 'karaoke-kitchen.sqlite');
const db = new Database(databasePath);
if (isProduction) {
  try {
    fs.chmodSync(dataDir, 0o700);
    fs.chmodSync(databasePath, 0o600);
  } catch (error) {
    console.warn('Could not tighten database permissions.', error);
  }
}
db.pragma('busy_timeout = 5000');
db.pragma('synchronous = NORMAL');
db.pragma('secure_delete = ON');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    tracking_token TEXT NOT NULL,
    customer_json TEXT NOT NULL,
    fulfilment_json TEXT NOT NULL,
    items_json TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    delivery_fee INTEGER NOT NULL,
    packing_fee INTEGER NOT NULL,
    total INTEGER NOT NULL,
    payment_method TEXT NOT NULL,
    payment_status TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    street_address TEXT,
    apt_suite TEXT,
    zip_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS customer_sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_customer_sessions_user ON customer_sessions(user_id);
`);

const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
if (!orderColumns.some(column => column.name === 'user_id')) db.exec('ALTER TABLE orders ADD COLUMN user_id TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC)');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', TRUST_PROXY_HOPS || false);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      imgSrc: ["'self'", 'data:', 'https://images.unsplash.com', 'https://lh3.googleusercontent.com'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'no-referrer' },
  strictTransportSecurity: isProduction ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
}));
app.use((req, res, next) => {
  const supplied = String(req.header('x-request-id') || '');
  const requestId = /^[A-Za-z0-9._-]{8,80}$/.test(supplied) ? supplied : randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=(), usb=()');
  next();
});
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.header('sec-fetch-site') === 'cross-site') return res.status(403).json({ error: 'Cross-site request blocked.' });
  const origin = req.header('origin');
  if (!origin) return next();
  const requestOrigin = req.protocol + '://' + req.get('host');
  let allowedOrigin = requestOrigin;
  try { allowedOrigin = isProduction ? new URL(APP_URL).origin : requestOrigin; } catch { allowedOrigin = requestOrigin; }
  if (origin !== allowedOrigin) return res.status(403).json({ error: 'Cross-site request blocked.' });
  next();
});

app.use(express.json({ limit: '250kb' }));

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
    z.object({
      type: z.literal('delivery'),
      streetAddress: z.string().trim().min(5).max(180),
      aptSuite: z.string().trim().max(100).optional(),
      zipCode: z.string().trim().regex(/^[0-9]{6}$/),
      instructions: z.string().trim().max(500).optional(),
    }),
    z.object({
      type: z.literal('pickup'),
      instructions: z.string().trim().max(500).optional(),
    }),
  ]),
  paymentMethod: z.literal('cod'),
  items: z.array(orderItemSchema).min(1).max(50),
});

type OrderRow = {
  id: string;
  order_number: string;
  tracking_token: string;
  user_id: string | null;
  customer_json: string;
  fulfilment_json: string;
  items_json: string;
  subtotal: number;
  delivery_fee: number;
  packing_fee: number;
  total: number;
  payment_method: 'cod';
  payment_status: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function createAdminToken() {
  const payload = Buffer.from(JSON.stringify({
    sub: ADMIN_EMAIL,
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 4 * 60 * 60 * 1000,
  })).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = String(req.header('authorization') || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return res.status(401).json({ error: 'Admin authentication required.' });
  const expected = createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return res.status(401).json({ error: 'Invalid session.' });
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (decoded.role !== 'admin' || decoded.sub !== ADMIN_EMAIL || decoded.exp < Date.now()) throw new Error('Expired');
    next();
  } catch {
    res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
}

class OrderInputError extends Error {}

for (const item of MENU_ITEMS) {
  for (const option of item.customOptions || []) optionSurcharge(option);
}

function calculateOrder(input: z.infer<typeof orderSchema>) {
  const catalog = new Map(MENU_ITEMS.map(item => [item.id, item]));
  const items = input.items.map(requested => {
    const menuItem = catalog.get(requested.menuItemId);
    if (!menuItem) throw new OrderInputError('An item in your cart is no longer available.');
    if (requested.selectedOption && !menuItem.customOptions?.includes(requested.selectedOption)) {
      throw new OrderInputError('A selected item option is no longer available.');
    }
    const unitPrice = menuItem.price + optionSurcharge(requested.selectedOption);
    return {
      menuItemId: menuItem.id,
      name: menuItem.name,
      isNonVeg: Boolean(menuItem.isNonVeg),
      selectedOption: requested.selectedOption,
      quantity: requested.quantity,
      unitPrice,
      lineTotal: unitPrice * requested.quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = 0;
  const packingFee = 0;
  const total = subtotal;
  if (total > 25_000) throw new OrderInputError('Orders above ₹25,000 must be placed directly with the kitchen.');
  return { items, subtotal, deliveryFee, packingFee, total };
}

function mapOrder(row: OrderRow, includePrivate = false) {
  const order = {
    id: row.id,
    orderNumber: row.order_number,
    items: JSON.parse(row.items_json),
    subtotal: row.subtotal,
    deliveryFee: row.delivery_fee,
    packingFee: row.packing_fee,
    total: row.total,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    estimatedMinutes: row.status === 'ready' ? 0 : 25,
    fulfilment: { type: JSON.parse(row.fulfilment_json).type },
  };
  return includePrivate ? {
    ...order,
    trackingToken: row.tracking_token,
    customer: JSON.parse(row.customer_json),
    fulfilment: JSON.parse(row.fulfilment_json),
  } : order;
}

type UserRow = {
  id: string; email: string; password_hash: string; first_name: string; last_name: string;
  phone: string; street_address: string | null; apt_suite: string | null; zip_code: string | null;
  created_at: string; updated_at: string;
};

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
const registrationLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false });
const customerAuthLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true });
const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const trackingLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);
const CUSTOMER_COOKIE = isProduction ? '__Host-tkk_session' : 'tkk_session';

function sessionHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function cookieValue(req: express.Request, name: string) {
  const cookies = String(req.header('cookie') || '').split(';');
  for (const cookie of cookies) {
    const [key, ...parts] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(parts.join('='));
  }
  return '';
}

function publicUser(user: UserRow) {
  return {
    id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name,
    name: `${user.first_name} ${user.last_name}`.trim(), phone: user.phone,
    streetAddress: user.street_address || '', aptSuite: user.apt_suite || '', zipCode: user.zip_code || '',
  };
}

function sessionUser(req: express.Request) {
  const token = cookieValue(req, CUSTOMER_COOKIE);
  if (!token) return undefined;
  const row = db.prepare(`
    SELECT users.* FROM customer_sessions
    JOIN users ON users.id = customer_sessions.user_id
    WHERE customer_sessions.token_hash = ? AND customer_sessions.expires_at > ?
  `).get(sessionHash(token), new Date().toISOString()) as UserRow | undefined;
  return row;
}

function requireCustomer(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = sessionUser(req);
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' });
  res.locals.customer = user;
  next();
}

function issueCustomerSession(res: express.Response, userId: string, rememberMe: boolean) {
  const token = randomBytes(32).toString('base64url');
  const lifetimeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
  const now = new Date();
  db.prepare('INSERT INTO customer_sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(sessionHash(token), userId, new Date(now.getTime() + lifetimeMs).toISOString(), now.toISOString());
  const attributes = [`${CUSTOMER_COOKIE}=${encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (isProduction) attributes.push('Secure');
  if (rememberMe) attributes.push(`Max-Age=${Math.floor(lifetimeMs / 1000)}`);
  res.setHeader('Set-Cookie', attributes.join('; '));
}

const passwordSchema = z.string().min(12).max(72).refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password is too long.');
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

app.post('/api/auth/register', registrationLimiter, async (req, res) => {
  const parsed = accountSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check your account details.', details: parsed.error.flatten() });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(parsed.data.email);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone, street_address, apt_suite, zip_code, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, parsed.data.email, passwordHash, parsed.data.firstName, parsed.data.lastName, parsed.data.phone,
    parsed.data.streetAddress, parsed.data.aptSuite, parsed.data.zipCode, now, now);
  issueCustomerSession(res, id, parsed.data.rememberMe);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  res.status(201).json({ user: publicUser(user) });
});

app.post('/api/auth/login', customerAuthLimiter, async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email().max(120), password: z.string().min(1).max(72), rememberMe: z.boolean().optional().default(true) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email.toLowerCase()) as UserRow | undefined;
  const fallbackHash = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.5cynB6YF7p3C76Z.R9lM7yY49umOWa';
  const passwordMatches = await bcrypt.compare(parsed.data.password, user?.password_hash || fallbackHash);
  if (!user || !passwordMatches) return res.status(401).json({ error: 'Invalid email or password.' });
  db.prepare('DELETE FROM customer_sessions WHERE expires_at <= ?').run(new Date().toISOString());
  issueCustomerSession(res, user.id, parsed.data.rememberMe);
  res.json({ user: publicUser(user) });
});

app.get('/api/auth/me', (req, res) => {
  const user = sessionUser(req);
  res.json({ user: user ? publicUser(user) : null });
});

app.post('/api/auth/logout', (req, res) => {
  const token = cookieValue(req, CUSTOMER_COOKIE);
  if (token) db.prepare('DELETE FROM customer_sessions WHERE token_hash = ?').run(sessionHash(token));
  res.setHeader('Set-Cookie', `${CUSTOMER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProduction ? '; Secure' : ''}`);
  res.json({ ok: true });
});

app.get('/api/account/orders', requireCustomer, (_req, res) => {
  const user = res.locals.customer as UserRow;
  const rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(user.id) as OrderRow[];
  res.json({ orders: rows.map(row => mapOrder(row, true)) });
});
app.get('/api/health', (_req, res) => {
  db.prepare('SELECT 1').get();
  res.json({ ok: true, mode: 'cod', store: currentStoreStatus() });
});
app.get('/api/store-status', (_req, res) => {
  res.json({ store: currentStoreStatus() });
});

app.post('/api/orders', orderLimiter, (req, res) => {
  const parsed = orderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Please check your order details.', details: parsed.error.flatten() });
  try {
    const store = currentStoreStatus();
    if (!store.open) return res.status(409).json({ error: `The kitchen is currently closed. ${store.nextChange}.`, store });
    const calculated = calculateOrder(parsed.data);
    const customerUserId = sessionUser(req)?.id || null;
    const id = randomUUID();
    const trackingToken = randomBytes(24).toString('base64url');
    const orderNumber = 'TKK-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + randomBytes(3).toString('hex').toUpperCase();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO orders (id, order_number, tracking_token, customer_json, fulfilment_json, items_json, subtotal, delivery_fee, packing_fee, total, payment_method, payment_status, status, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, orderNumber, trackingToken, JSON.stringify(parsed.data.customer),
      JSON.stringify(parsed.data.fulfilment), JSON.stringify(calculated.items),
      calculated.subtotal, calculated.deliveryFee, calculated.packingFee, calculated.total,
      'cod', 'cod_pending', 'received', customerUserId, now, now,
    );
    res.status(201).json({
      order: { ...mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRow), trackingToken },
    });
  } catch (error) {
    if (error instanceof OrderInputError) return res.status(400).json({ error: error.message });
    console.error('Order creation failed', { requestId: res.locals.requestId, error });
    res.status(500).json({ error: 'Could not place order. Please try again.', requestId: res.locals.requestId });
  }
});

app.get('/api/orders/:id', trackingLimiter, (req, res) => {
  const token = String(req.query.token || '');
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow | undefined;
  if (!row || !safeEqual(token, row.tracking_token)) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: mapOrder(row) });
});

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, skipSuccessfulRequests: true });
const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 12);

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(8).max(200) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const emailMatches = safeEqual(parsed.data.email.toLowerCase(), ADMIN_EMAIL);
  const passwordMatches = await bcrypt.compare(parsed.data.password, passwordHash);
  if (!emailMatches || !passwordMatches) return res.status(401).json({ error: 'Invalid admin credentials.' });
  res.json({ token: createAdminToken(), admin: { email: ADMIN_EMAIL } });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const status = String(req.query.status || 'active');
  const requestedPage = Number(req.query.page || 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 100_000) : 1;
  const limit = 50;
  const offset = (page - 1) * limit;
  let rows: unknown[];
  let count: { count: number };
  if (status === 'all') {
    rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    count = db.prepare('SELECT COUNT(*) AS count FROM orders').get() as { count: number };
  } else if (status === 'active') {
    rows = db.prepare("SELECT * FROM orders WHERE status IN ('received', 'confirmed', 'cooking', 'ready') ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
    count = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status IN ('received', 'confirmed', 'cooking', 'ready')").get() as { count: number };
  } else if (status === 'history') {
    rows = db.prepare("SELECT * FROM orders WHERE status IN ('completed', 'cancelled') ORDER BY updated_at DESC LIMIT ? OFFSET ?").all(limit, offset);
    count = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE status IN ('completed', 'cancelled')").get() as { count: number };
  } else {
    const parsedStatus = z.enum(['received', 'confirmed', 'cooking', 'ready', 'completed', 'cancelled']).safeParse(status);
    if (!parsedStatus.success) return res.status(400).json({ error: 'Invalid order status filter.' });
    rows = db.prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').all(parsedStatus.data, limit, offset);
    count = db.prepare('SELECT COUNT(*) AS count FROM orders WHERE status = ?').get(parsedStatus.data) as { count: number };
  }
  const total = Number(count.count || 0);
  res.json({ orders: (rows as OrderRow[]).map(row => mapOrder(row, true)), pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
});
app.patch('/api/admin/orders/:id/status', requireAdmin, (req, res) => {
  const parsed = z.object({ status: z.enum(['received', 'confirmed', 'cooking', 'ready', 'completed', 'cancelled']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid order status.' });
  const result = db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?')
    .run(parsed.data.status, new Date().toISOString(), req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as OrderRow, true) });
});

app.get('/api/admin/summary', requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
    FROM orders GROUP BY status
  `).all() as Array<{ status: string; count: number; revenue: number }>;
  const today = new Date().toISOString().slice(0, 10);
  const todayStats = db.prepare(`
    SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue
    FROM orders WHERE substr(created_at, 1, 10) = ? AND status != 'cancelled'
  `).get(today);
  res.json({ byStatus: rows, today: todayStats });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (error instanceof SyntaxError) return res.status(400).json({ error: 'Invalid JSON request body.' });
  if (typeof error === 'object' && error && 'type' in error && error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large.' });
  console.error('Unhandled request error', { requestId: res.locals.requestId, error });
  res.status(500).json({ error: 'Unexpected server error.', requestId: res.locals.requestId });
});

const distDir = path.join(rootDir, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    index: false,
    maxAge: '1h',
    setHeaders: (res, assetPath) => {
      if (assetPath.includes(path.sep + 'assets' + path.sep)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log('Karaoke Kitchen API listening on http://localhost:' + PORT);
  if (!isProduction) console.log('Local admin: ' + ADMIN_EMAIL);
});
function shutdown() {
  server.close(() => { db.close(); process.exit(0); });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);







