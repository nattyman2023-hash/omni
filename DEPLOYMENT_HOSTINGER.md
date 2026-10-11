# Hostinger deployment preparation

For the current temporary-domain handover, use
`docs/HOSTINGER_TEMP_DEPLOYMENT.md`, import
`deployment/hostinger-schema.sql` into the new Hostinger database, and upload the
clean ZIP named in that handover after the final verification run.

No deployment, branch push or production connection was made during this build.

## Node.js application settings

- Node.js: 20 LTS or newer (the local build was verified with Node 24.15.0).
- Install command: `npm install`.
- Build command: `npm run build`.
- Application output: `dist` for the frontend; `dist-server` is generated for the Express entry.
- Application entry: `dist-server/server.js`.
- Start command: `npm start`.
- Bind address: the server binds to `0.0.0.0` and uses `process.env.PORT`.
- Public health check: `/api/health`.

## Environment

Copy the variable names from `.env.example` into Hostinger’s Node.js environment configuration. Do not upload `.env` or commit credentials. Required production values are documented in `ENVIRONMENT_VARIABLES.md`.

## Database and uploads

Create a brand-new Hostinger MySQL database and import
`deployment/hostinger-schema.sql` through phpMyAdmin before starting the
temporary application. This is the authoritative initial Hostinger setup method.
The ordered `npm run db:migrate` runner remains available for reviewed future
additive migrations when an execution mechanism is available; it is not a second
initial-install path.

Uploaded files are written through a storage abstraction to `UPLOAD_DIR` using random filenames and private storage. Configure `UPLOAD_DIR` to a persistent directory available to the Node.js application. If the selected Hostinger plan does not provide persistent local storage for Node processes, connect an object-storage adapter before enabling production uploads; do not expose the private directory through the web server.

## Domain and SSL

Point the chosen domain to the Hostinger Node.js application, configure `APP_URL` to the canonical HTTPS origin, and enable Hostinger SSL before publishing forms. Confirm `https://your-domain/api/health`, `robots.txt`, `sitemap.xml`, a public deep link and `/staff` after DNS and SSL are active.

## Smoke tests after deployment

1. Check `/api/health` reports `status: ok` and `database: connected`.
2. Refresh `/services/home-extensions`, `/projects/open-plan-extension` and `/quote` directly.
3. Submit a contact enquiry and confirm the database row and notification status.
4. Submit a quote with a safe JPG and confirm the quote row and file row.
5. Confirm invalid file types and oversized uploads are rejected.
6. Confirm `/api/admin/summary` returns 401 before staff login.
7. Sign in with configured staff credentials and confirm staff routes are not public.

## Rollback

Keep the last known-good build and database migration version. Stop or switch the Node.js application to the previous build, restore the previous environment configuration, and only reverse a database migration with a reviewed down-migration or a database backup. Never delete uploaded files as part of a routine application rollback.
