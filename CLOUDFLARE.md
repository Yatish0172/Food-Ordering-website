# Cloudflare Workers + D1 deployment

This is the primary production target. The React/Vite storefront is served as Worker static assets and `/api/*` runs in `worker/index.ts`. Orders, accounts, sessions, and rate limits persist in D1.

## Free-tier architecture

- Cloudflare Workers Free: storefront and API
- Cloudflare D1 Free: persistent SQL data
- One Worker deployment serves both the website and API
- GitHub repository: `Yatish0172/Food-Ordering-website`

## Required secrets

Configure these in Cloudflare Workers & Pages > karaoke-kitchen > Settings > Variables and Secrets. Mark all four as encrypted secrets.

- `ADMIN_EMAIL`: private admin email
- `ADMIN_PASSWORD`: unique 14+ character password with upper/lowercase, number, and symbol
- `AUTH_SECRET`: at least 64 cryptographically random characters
- `DELIVERY_PIN_CODES`: comma-separated six-digit serviceable PIN codes

`APP_URL` is non-secret and is set in `wrangler.jsonc`. Use the temporary `workers.dev` origin during staging, then change it to the final HTTPS custom domain.

## CLI deployment

1. `npm ci`
2. `npm run check`
3. `npx wrangler login`
4. `npm run cf:deploy`
5. Add the four required secrets in the dashboard or with `npx wrangler secret put NAME`.
6. `npm run cf:migrate:remote`
7. Redeploy if Wrangler requests it after secret changes.

Wrangler automatically provisions the D1 binding on the first deployment. The schema is versioned in `migrations/0001_initial.sql`.

## Git deployment

In Cloudflare Workers & Pages, choose Import a repository and select `Yatish0172/Food-Ordering-website`.

- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`
- Root directory: `/`
- Production branch: `main`

After the first deployment, add the required secrets and apply `migrations/0001_initial.sql` from the D1 console or run `npm run cf:migrate:remote` locally.

## Domain

A Worker custom domain requires the domain to be an active Cloudflare zone. Add `www.karaokekitchen.co.in` from the Worker's Domains page after moving authoritative DNS to Cloudflare. Cloudflare creates the routing record and TLS certificate.

## Validation

- `npm run lint`: checks both Node and Worker TypeScript projects
- `npm run build`: builds the Vite storefront
- `npm run cf:dry-run`: validates the Worker bundle and static asset upload
- `npm run cf:migrate:local`: applies D1 migrations locally
- `npm run test:security`: keeps the legacy Express security regression suite available
