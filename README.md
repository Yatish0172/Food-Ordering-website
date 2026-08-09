# The Karaoke Kitchen

Full-stack COD food ordering for a single kitchen: React/Vite storefront, Express API, SQLite persistence, customer accounts and order history, guest checkout, delivery or pickup, and an admin order dashboard.

## Local development

1. Install Node.js 20 or newer.
2. Run npm install.
3. Copy .env.example to .env.local and set local admin credentials.
4. Run npm run dev.
5. Open http://localhost:3000. Staff login is linked in the footer.

Local SQLite data is stored in data/karaoke-kitchen.sqlite.

## Production

The primary production target is Cloudflare Workers + D1. It keeps the storefront, API, accounts, orders, sessions, and admin dashboard on the Cloudflare free tier. See `CLOUDFLARE.md` for setup, secrets, migrations, Git deployment, and domain instructions.

The previous Railway/SQLite deployment remains available as a fallback through `npm run build:railway` and `RAILWAY.md`.

## Legacy Railway production

npm run build creates the frontend in dist and the bundled Express server in dist-server. npm start runs one service that serves both the website and /api.

This release accepts Cash on Delivery only. Unsupported payment methods are rejected by the API. Customer sessions use opaque server-side tokens in HttpOnly, SameSite=Lax cookies; production cookies are Secure. The application also enforces a Content Security Policy, same-origin writes, request-size limits, endpoint-specific rate limits, server-authoritative pricing, and controlled JSON errors.

Keep one application replica while using SQLite and mount persistent storage before accepting real orders. See RAILWAY.md for the complete launch, volume, backup, domain, smoke-test, and rollback runbook.

## Checks

- npm run lint — TypeScript validation
- npm run build — production build
- npm run check — validation and build
- npm run test:security — isolated COD API and security smoke suite
- npm audit --omit=dev — production dependency audit
- npm start — run the built frontend and API