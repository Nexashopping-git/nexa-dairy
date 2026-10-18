# NexaShopping Diary portal

Read-only React + Vite portal for existing active customers and distributors. It uses the diary-only, existing-account OTP API. There is no signup, entry creation, approval, or payment flow here.

## Local development

1. Copy `.env.example` to `.env.local` and set `VITE_API_URL` to the API origin.
2. Run `npm install` and `npm run dev`.
3. The API must allow the local Vite origin in CORS.

Run `npm test` and `npm run build` before deploying.

## Hosting

Deploy the `dist/` output as a static site for `diary.nexashopping.in`. Set `VITE_API_URL=https://api.nexashopping.in` at **build time**. Point DNS for the subdomain to the static host and enable HTTPS there. Add `https://diary.nexashopping.in` to the API CORS origins. Do not publish until legal/content approval and a staging end-to-end check are complete.

For Cloudflare Workers Builds, connect the repository's `main` branch, set the build command to `npm run build` and the deploy command to `npx wrangler deploy`. Set `VITE_API_URL=https://api.nexashopping.in` as a **build variable**. `wrangler.jsonc` publishes `dist/` as static assets with an SPA fallback. Test the `workers.dev` URL before attaching `diary.nexashopping.in` as a Worker Custom Domain. The API, database, and OTP service continue to run on the existing backend.

The portal stores the bearer token in tab-scoped `sessionStorage` and validates it through `/api/v1/auth/me` on reload. API authorization remains authoritative. Never put tokens or OTP values in analytics or logs.
