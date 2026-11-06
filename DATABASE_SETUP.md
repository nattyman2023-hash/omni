# Database setup

The database is MySQL-compatible. Initial Hostinger setup and future application
migrations have deliberately separate roles.

## Initial Hostinger setup

Create a new empty Hostinger MySQL database and import `deploy/schema.sql` through
phpMyAdmin. This generated file is additive and re-runnable. The ordered files in
`database/migrations` are the schema source of truth; `npm run db:schema:generate`
rebuilds the import file and `npm run db:schema:check` fails if it has drifted.
Do not import it into an existing or live production database.

## Future additive migrations

Versioned SQL migrations live in `database/migrations`.

1. Create an empty MySQL database and user.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` and `DATABASE_PASSWORD`.
4. Run:

```bash
npm run db:migrate
```

The initial schema creates `users`, `site_settings`, `services`, `service_faqs`,
`projects`, `project_media`, `project_tags`, `project_categories`, `areas`,
`testimonials`, `guides`, `guide_categories`, `contact_enquiries`, `quote_requests`,
`quote_request_files` and `activity_audit_records`, plus `schema_migrations`.

The server uses parameterized `mysql2` queries. In `NODE_ENV=production`, missing
or unreachable MySQL, or an incomplete schema, puts health into HTTP 503 degraded
mode. Contact and quote APIs refuse the request with an honest retry-by-phone/email
message; they never report success or fall back to memory.

## Sales CRM, email and e-signature tables

Migration `004_crm_sales_email_signing.sql` adds the sales stack:

- `crm_contacts` — every lead and customer in a single contact record.
- `crm_quotes` / `crm_quote_items` — line-item quotations and contracts, revisions
  (`parent_quote_id` + `version`) and e-signature state (`sign_token`, `sign_status`,
  `signed_at`, `signer_name/email/ip`).
- `crm_invoices` / `crm_invoice_items` — the legacy flat invoice table is replaced by
  a full invoice model that supports stage payments.
- `crm_email_templates`, `crm_emails` — editable templates plus the outbound/inbound
  email log.
- `crm_followup_sequences` — scheduled chases for unsigned quotes and unpaid invoices.

The same migration seeds company and bank details in `site_settings` (taken from the
supplied invoice) and inserts the default email templates. It uses
`CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE`, so it is safe to re-run. The invoice
tables are dropped and recreated, so run this migration before entering live invoice
data — no invoice records exist in the previous release.

## Disposable persistence verification

Copy `.env.test.example` to an ignored `.env.test` or set the five
`TEST_DATABASE_*` variables in the current shell, build, and run:

```bash
npm run build
npm run test:mysql
```

The suite applies the authoritative migrations and creates disposable rows, so use
only a dedicated empty/test database. It refuses to run without the test variables,
against a database name that is not clearly test/QA/sandbox, against a name that
looks production/live, or when test and production configurations match. It never
falls back to `DATABASE_*`.

No production seed records are included. Owner-approved content and operational CRM records should be created through the protected admin/content workflow after credentials and database access are configured.
