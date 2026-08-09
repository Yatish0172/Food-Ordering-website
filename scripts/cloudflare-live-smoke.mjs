import process from 'node:process';

const baseUrl = (process.argv[2] || process.env.APP_URL || '').replace(/\/$/, '');
if (!/^https:\/\//.test(baseUrl)) throw new Error('Usage: node scripts/cloudflare-live-smoke.mjs https://your-worker.example');

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`PASS ${message}`);
}

const home = await fetch(baseUrl + '/', { redirect: 'follow' });
assert(home.ok, 'live storefront responds');
assert(home.headers.get('content-security-policy')?.includes("default-src 'self'"), 'live storefront has CSP');
assert(home.headers.get('strict-transport-security')?.includes('max-age='), 'live storefront has HSTS');

const health = await fetch(baseUrl + '/api/health');
const payload = await health.json().catch(() => ({}));
assert(health.status === 200, `live health status is 200 (received ${health.status}; missing: ${(payload.missing || []).join(', ') || 'none'})`);
assert(payload.ok && payload.configuration === 'ready' && payload.platform === 'cloudflare', 'live configuration reports ready');

const missing = await fetch(baseUrl + '/api/not-a-route');
assert(missing.status === 404 && (await missing.json()).error === 'API endpoint not found.', 'unknown live API route is controlled');
