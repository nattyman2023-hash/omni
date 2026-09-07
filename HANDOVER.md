# Handover

The local implementation is ready for review and has not been deployed.

Start with `npm install`, then `npm run dev` and open `http://localhost:5173`. Use `npm run build && npm start` to test the production-shaped server.

Key files:

- `client/src/App.tsx` — public routes, shared components, forms and staff UI.
- `client/src/styles.css` — approved architectural visual system and responsive layouts.
- `client/src/data/content.ts` — editable local content inventory.
- `server/server.ts` — health endpoint, contact and quote APIs, uploads, rate limiting and protected staff API.
- `database/migrations/001_initial.sql` — versioned MySQL schema.
- `public/images/` — selected copies of supplied photography.

Review `REAL_CONTENT_REQUIRED.md` before production content entry. Configure the environment and MySQL before accepting live enquiries. Review `DEPLOYMENT_HOSTINGER.md` for Hostinger settings and post-deployment smoke tests.
