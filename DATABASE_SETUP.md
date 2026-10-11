# Database setup

The database is MySQL-compatible. Initial Hostinger setup and future application
migrations have deliberately separate roles.

## Initial Hostinger setup

Create a new empty Hostinger MySQL database and import
`deployment/hostinger-schema.sql` through phpMyAdmin. The file is additive and
re-runnable, contains the current schema and guarded neutral project records, and
records the represented migration versions. Do not import it into an existing or
live production database.

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

The server uses parameterized `mysql2` queries. It will not fail startup when credentials are absent, but it reports the missing database in `/api/health` and should remain a development-only state.

No production seed records are included. Owner-approved content and operational CRM records should be created through the protected admin/content workflow after credentials and database access are configured.
