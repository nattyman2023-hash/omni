# Database setup

The database is MySQL-compatible and uses versioned SQL migrations in `database/migrations`.

1. Create an empty MySQL database and user.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_NAME`, `DATABASE_USER` and `DATABASE_PASSWORD`.
4. Run:

```bash
npm run db:migrate
```

The initial migration creates `users`, `site_settings`, `services`, `service_faqs`, `projects`, `project_media`, `project_categories`, `areas`, `testimonials`, `guides`, `guide_categories`, `contact_enquiries`, `quote_requests`, `quote_request_files` and `activity_audit_records`, plus `schema_migrations`.

The server uses parameterized `mysql2` queries. It will not fail startup when credentials are absent, but it reports the missing database in `/api/health` and should remain a development-only state.

No production seed records are included. Owner-approved content and operational CRM records should be created through the protected admin/content workflow after credentials and database access are configured.
