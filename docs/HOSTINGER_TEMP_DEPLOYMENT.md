# Hostinger temporary review preparation

This document describes the inspected application and the files prepared for a new,
separate Hostinger temporary domain. No deployment, DNS change, domain redirect or
production database connection was performed.

## Application settings

| Item | Verified value |
| --- | --- |
| Application root | `C:\Users\Natty\Desktop\Anti Grav\Omni` |
| Frontend | React with Vite (`client/`, Vite root) |
| Backend | Express with TypeScript (`server/server.ts`) |
| Local Node version | 24.15.0; package engine is Node 20 or newer |
| Package manager | npm (`package-lock.json` is present) |
| Build command | `npm run build` |
| Start command | `npm start` |
| Server entry | `dist-server/server.js` after build |
| Frontend output | `dist/` |
| Migration system | Ordered SQL files in `database/migrations/`, run by `npm run db:migrate` |
| Database driver | `mysql2/promise` pool in the Express server |
| Health URL | `/health` (safe response) and `/api/health` |

The server reads the Hostinger-provided `PORT`, binds to `0.0.0.0`, serves the Vite
build and supports direct refreshes for the registered React routes. API requests use
same-origin `/api/...` paths. Vite's local-only proxy remains in `vite.config.mts`
and is not used by the production server.

## Environment checklist

Use `.env.hostinger.example` as the names-only checklist. Configure values in
Hostinger's environment settings; do not upload `.env` or place credentials in this
repository.

Required for the configured application/database:

`NODE_ENV`, `PORT`, `APP_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
`DATABASE_USER`, `DATABASE_PASSWORD`, `TRUST_PROXY`, `COOKIE_SECURE`,
`STAGING_MODE`, and `OUTBOUND_MESSAGES_ENABLED`.

For this temporary review domain use `STAGING_MODE=true` and
`OUTBOUND_MESSAGES_ENABLED=false`. The server adds
`X-Robots-Tag: noindex, nofollow, noarchive`, the client adds matching robots
metadata, and `robots.txt` disallows crawling. `/health` does not expose database
state in staging mode. No email adapter, SMS adapter or WhatsApp automation is
enabled by this application.

## Database migration method

The authoritative method is the checked-in migration runner:

```text
npm run db:migrate
```

It connects using the existing `DATABASE_*` convention, creates `schema_migrations`
if needed, checks each migration version before execution, runs only unapplied SQL
files in filename order, and records the migration version. Re-running the command
skips applied files. The current migrations are:

1. `database/migrations/001_initial.sql` — current site, enquiry, quote, upload,
   project and audit tables.
2. `database/migrations/002_project_content.sql` — project tags and supplied project
   content/media, guarded by `IF NOT EXISTS` and duplicate checks.

No live database was connected during preparation. Run migrations only against the
new Hostinger temporary database after checking the database name and user.

## Administrator bootstrap

The first administrator can be created once by setting the following environment
variables before starting the application:

```text
BOOTSTRAP_ADMIN_EMAIL
BOOTSTRAP_ADMIN_PASSWORD
BOOTSTRAP_ADMIN_NAME
```

On startup, the server creates an `owner` user only when no `owner` or `admin` row
exists and does not overwrite an existing user. The password is hashed with
`bcryptjs`; it is never logged. Remove `BOOTSTRAP_ADMIN_PASSWORD` after the first
successful login. When a MySQL database is configured, staff login uses the active
database user records. Without MySQL, local development may use the existing
`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` fallback, which is not a production mode.

## Storage and uploads

Quote files are written to `UPLOAD_DIR` using randomized filenames and are not served
by Express as public files. Project images use `PROJECT_UPLOAD_DIR` and are served
publicly only when their project record is published. Both are local filesystem
storage, not database or object storage. Configure persistent Hostinger storage and
verify a file survives restart/redeployment before treating uploads as production
safe. No executable upload types are accepted; file content is checked by magic bytes
and the application limit is 8 MB per file.

## Hostinger values to enter

| Setting | Value |
| --- | --- |
| Framework selection | Node.js application (manual/custom application if offered) |
| Node version | Node 20 LTS or newer; local verification used Node 24.15.0 |
| Application/root directory | Upload the prepared package contents to the application root selected in Hostinger |
| Build command | `npm run build` |
| Output directory | `dist` (generated frontend; Express also needs `dist-server`) |
| Entry file | `dist-server/server.js` |
| Start command | `npm start` |
| Database migration | `npm run db:migrate` over the deployment shell after environment setup |
| Health URL | `/health` |

Do not hardcode a port. Do not use the current live Omni domain or its database.

## Local verification performed

The local production-shaped server passed the public route, form, staff login/logout,
upload validation and project publishing checks previously recorded in
`TEST_REPORT.md`. The current build also passes `npm test`, `npm run lint`,
`npm run typecheck` and `npm run build`. MySQL was not available locally, so direct
database-row persistence and a real Hostinger migration run remain unverified.

## Deployment package

The prepared ZIP is:

`C:\Users\Natty\Desktop\Anti Grav\Omni\deployment\omni-hostinger-temporary-review-final.zip`

It excludes `node_modules`,
`.git`, `.env` files, generated build output, QA screenshots/reports, Stitch/source
reference folders, local uploads, local database files and logs. It includes the
application source, public images, migrations, package lockfile and environment
examples.

## Rollback and safety

Keep the ZIP and the previous temporary-domain build available. Stop or switch the
Node application before replacing files. Do not alter the current live Omni domain,
redirects or production database. Any database rollback must use a reviewed backup or
down-migration; never reset, truncate or reseed a live database.
