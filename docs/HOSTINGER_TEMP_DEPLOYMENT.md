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
| Deployment branch | `hostinger-temporary-review` |

The server reads the Hostinger-provided `PORT`, binds to `0.0.0.0`, serves the Vite
build and supports direct refreshes for the registered React routes. API requests use
same-origin `/api/...` paths. Vite's local-only proxy remains in `vite.config.mts`
and is not used by the production server.

## Environment checklist

Use `.env.hostinger.example` as the names-only checklist. Configure values in
Hostinger's environment settings; do not upload `.env` or place credentials in this
repository.

Required for the configured temporary application/database:

`NODE_ENV`, `PORT`, `APP_URL`, `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`,
`DATABASE_USER`, `DATABASE_PASSWORD`, `TRUST_PROXY`, `COOKIE_SECURE`,
`STAGING_MODE`, and `OUTBOUND_MESSAGES_ENABLED`.

`SESSION_SECRET` should also be generated and stored in Hostinger now so it is
available when database-backed staff sessions are introduced. The current build
does not yet consume it; staff sessions are process-memory only and are cleared by
a restart.

For this temporary review domain use `STAGING_MODE=true` and
`OUTBOUND_MESSAGES_ENABLED=false`. The server adds
`X-Robots-Tag: noindex, nofollow, noarchive`, the client adds matching robots
metadata, and `robots.txt` disallows crawling. `/health` does not expose database
state in staging mode. No email adapter, SMS adapter or WhatsApp automation is
enabled by this application.

## Database migration method

For the first Hostinger setup, the authoritative method is manual import through
phpMyAdmin of:

```text
deploy/schema.sql
```

The combined file is generated from the ordered migrations, additive and re-runnable. It creates the migration-history
table, the tables required by the currently implemented site and project workspace,
their foreign keys, and the existing neutral supplied-photo project records. It
does not drop, truncate or delete data.

The ordered files in `database/migrations` are authoritative. `npm run
db:schema:generate` builds `deploy/schema.sql`, and the normal test suite rejects
schema drift. The checked-in `npm run db:migrate` runner safely applies reviewed
future additive migration files when the deployment environment provides a
safe way to execute it. It connects using the same `DATABASE_*` variables, checks
`schema_migrations`, and skips recorded versions. It is not required for the first
Hostinger import because managed Node.js hosting does not provide a general npm-over-
SSH workflow.

The source migrations represented by the combined file are:

1. `database/migrations/001_initial.sql` — current site, enquiry, quote, upload,
   project and audit tables.
2. `database/migrations/002_project_content.sql` — project tags and supplied project
   content/media, guarded by `IF NOT EXISTS` and duplicate checks.

No live database was connected during preparation. Import the combined schema only
into the new Hostinger temporary database after checking the database name and user.
Never import it into the existing production database.

The current CRM navigation contains placeholder screens for leads, quotes, site
visits, calendar, tasks and invoices. This batch does not expand those modules.
Tables are included only for currently implemented users, settings, content,
projects/media/tags, contact enquiries, quote requests/files and audit records.

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
from the project upload route. Both currently use local filesystem storage, not the
database or object storage. Configure absolute persistent Hostinger paths outside a
release/build directory and verify that both file types survive a restart and a
redeployment before treating uploads as safe. No executable upload types are
accepted; file content is checked by magic bytes and the application limit is 8 MB
per file.

## Hostinger values to enter

| Setting | Value |
| --- | --- |
| Framework selection | Express.js when detected; otherwise Node.js `Other`/custom application |
| Node version | Node 20 LTS or newer; local verification used Node 24.15.0 |
| Application/root directory | Upload the prepared package contents to the application root selected in Hostinger |
| Build command | `npm run build` |
| Output directory | `dist` (generated frontend; Express also needs `dist-server`) |
| Entry file | `dist-server/server.js` |
| Start command | `npm start` |
| Database migration | Import `deploy/schema.sql` through phpMyAdmin before first start |
| Health URL | `/health` |

Do not hardcode a port. Do not use the current live Omni domain or its database.

## Local verification performed

The local production-shaped server passed the public route, form, staff login/logout,
upload validation and project publishing checks previously recorded in
`TEST_REPORT.md`. The current temporary-package verification is recorded there as
well. MySQL was not available locally, so direct database-backed public-form and
restart-persistence checks remain unverified and must be completed on the new
temporary Hostinger database before acceptance.

## Deployment package

The previous `omni-hostinger-temporary-review-20261011.zip` is superseded and must
not be uploaded. The replacement verification package is
`deployment/omni-hostinger-phase1-mysql-verification-20261011.zip`. It is a
candidate for disposable MySQL verification only and is not the final upload until
the persistence suite passes.

It excludes `node_modules`, `.git`, `.env` files, generated build output, QA
screenshots/reports, Stitch/source reference folders, local uploads, local database
files and logs. It includes the application source, public images, ordered source
migrations, generated `deploy/schema.sql`, the package lockfile and names-only
environment examples.

## Rollback and safety

Keep the ZIP and the previous temporary-domain build available. Stop or switch the
Node application before replacing files. Do not alter the current live Omni domain,
redirects or production database. Any database rollback must use a reviewed backup or
down-migration; never reset, truncate or reseed a live database.
