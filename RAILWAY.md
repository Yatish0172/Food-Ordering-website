# Railway production launch runbook

## 1. Release gate

Before deployment, run npm ci, npm run check, npm run test:security, and npm audit --omit=dev. Do not deploy if any command fails.

## 2. Service

Create one Railway service from a private GitHub repository. railway.json configures the production build, start command, health check, and restart policy.

Keep exactly one replica. SQLite and its attached volume must not be horizontally scaled.

## 3. Persistent storage

Attach one Railway volume and mount it at /data. Set DATA_DIR=/data. The application writes /data/karaoke-kitchen.sqlite in WAL mode.

The application deliberately refuses to boot in production without an explicit DATA_DIR, preventing accidental use of ephemeral storage.

## 4. Required production variables

- NODE_ENV=production
- DATA_DIR=/data
- APP_URL=https://YOUR-GENERATED-DOMAIN.up.railway.app
- TRUST_PROXY_HOPS=1
- DELIVERY_PIN_CODES=comma-separated-6-digit-serviceable-pin-codes
- ADMIN_EMAIL=your-private-admin-email
- ADMIN_PASSWORD=a-unique-14-plus-character-password-with-upper-lower-number-symbol
- AUTH_SECRET=a-random-secret-of-at-least-64-characters

Generate AUTH_SECRET with a cryptographically secure password manager or with Node crypto randomBytes. Never commit production secrets.

TRUST_PROXY_HOPS=1 is for Railway's single public proxy hop. Do not increase it without verifying the actual network path.

## 5. Staging acceptance

Generate a temporary Railway HTTPS domain, set it as APP_URL, and redeploy. Confirm /api/health returns {"ok":true,"mode":"cod"}.

Test on desktop and a real phone:

- Browse and search all menu categories; verify images and prices.
- Confirm paid custom options change the cart subtotal and API total.
- Place guest pickup and delivery COD orders.
- Register, refresh, sign out, sign in, place an order, and verify My Orders.
- Track an order with its private tracking link.
- Sign in as admin and move orders through the kitchen workflow.
- Verify a forged payment method is rejected with HTTP 400.
- Verify unknown /api routes return JSON 404 responses.
- Restart and redeploy; verify accounts and orders remain.

## 6. Backups

Enable daily and weekly Railway volume backups. Create an on-demand backup immediately before launch and before schema-affecting releases. Perform one restore rehearsal before accepting real orders.

## 7. Custom domain

In Railway Public Networking, add the canonical domain and follow the generated DNS instructions. Add both the CNAME or ALIAS record and Railway's TXT ownership record. Allow Railway to issue HTTPS.

Use one canonical hostname, update APP_URL to that exact HTTPS origin, and redeploy. Redirect the alternate www or apex hostname at the DNS provider layer.

After cutover verify HTTPS, /api/health, COD ordering, tracking, the admin dashboard, security headers, and the browser console.

## 8. Launch and rollback

Before launch, create a volume backup and retain the prior successful Railway deployment. Place one real COD order and complete it through the admin dashboard.

If health checks, ordering, or admin operations fail, roll back to the previous deployment. Restore the volume only for confirmed data corruption; application rollback normally must not roll back newer order data.