# Omni Developments website

A Hostinger-compatible React/Vite frontend with an Express API for Omni Developments. The public website is built from the supplied Stitch exports and supplied project photography, with reusable service, project, area and guide templates.

For ordinary shared hosting, the repository also includes a PHP 8.1 + MySQL API with the same frontend contract. This keeps the React interface while removing the need for a continuously running Node process. See `DEPLOYMENT_PHP.md`.

## Local preview

Requirements: Node.js 20 LTS or newer and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173` while developing. The Vite server proxies `/api` to the Express server at `http://localhost:3000`.

For the production-shaped local run:

```bash
npm run build
npm start
```

Open `http://localhost:3000`.

## Available commands

Use `npm run build:php` to create the PHP shared-hosting upload package in `deployment/php-public-html`.

- `npm run dev` — Vite and Express development servers.
- `npm run build` — production frontend build plus compiled server.
- `npm start` — serves `dist` and `/api/*` from Express.
- `npm test` — generated-schema drift, content, route-data and production database-guard checks.
- `npm run typecheck` — TypeScript checks for client, server and tests.
- `npm run test:mysql` — restart-persistence checks against an explicitly configured disposable MySQL database.
- `npm run db:migrate` — applies SQL migrations after MySQL environment variables are configured.

## Implemented areas

Public routes, responsive navigation, service filtering, project filtering, project galleries, area pages, guide articles, accessible accordions, contact submission, six-step quote wizard, upload validation, non-sequential public references, rate limiting, honeypot protection, private upload storage, protected staff login structure, health endpoint, sitemap, robots rules and production fallback routing are included.

The local development fallback stores submissions in process memory. In production,
MySQL and the expected schema are mandatory: health is degraded and contact/quote
requests return an honest 503 response if durable storage is unavailable. See
`DATABASE_SETUP.md`.

## Content status

Real customer reviews, owner-approved legal copy, verified case-study facts, project prices, accreditations and operational CRM records were not present in the supplied source material. The site uses explicit empty states for those items. See `REAL_CONTENT_REQUIRED.md`.
