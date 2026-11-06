# Sales CRM, email and e-signature

This release turns the staff workspace into a complete quote → contract → invoice
pipeline with email, e-signature and automatic follow-ups.

## What staff can do

| Area | Route | Capabilities |
| --- | --- | --- |
| Contacts | `/staff/contacts` | One record per lead/customer. Track type, lead stage, source, notes and owner. |
| Contracts | `/staff/contracts` | Build line-item quotations, edit them, revise/amend a live contract (new version, original retained), email the PDF with a signing link, and raise a stage-payment invoice. |
| Invoices | `/staff/invoices` | Create line-item invoices, edit, email the PDF, and mark paid. |
| Email | `/staff/email` | Compose and send email, sync the IMAP inbox, edit the automated templates, and run/review follow-ups. |
| Signing page | `/sign/<token>` | Public, token-only page where the customer reviews the quotation and signs electronically. |

The website form submissions (`/staff/leads`, `/staff/quotes`) remain separate so
inbound enquiries are never mixed with the outbound sales pipeline.

## Email configuration (SMTP + IMAP)

The CRM sends from your existing domain mailbox over SMTP and pulls replies over
IMAP. Add these to the environment (see `.env.example`):

```
SMTP_HOST=mail.yourdomain.co.uk
SMTP_PORT=587
SMTP_SECURE=false          # true for port 465
SMTP_USER=admin@omnidevelopment.co.uk
SMTP_PASSWORD=...
EMAIL_FROM="Omni Developments <admin@omnidevelopment.co.uk>"
EMAIL_REPLY_TO=admin@omnidevelopment.co.uk
ADMIN_NOTIFICATION_EMAIL=admin@omnidevelopment.co.uk

IMAP_HOST=mail.yourdomain.co.uk
IMAP_PORT=993
IMAP_SECURE=true
IMAP_USER=admin@omnidevelopment.co.uk
IMAP_PASSWORD=...

SIGNING_BASE_URL=https://omnidevelopment.co.uk
OUTBOUND_MESSAGES_ENABLED=true
```

Until SMTP is configured, document emails are recorded in the email log with status
`queued` — the system never reports a message as sent when it was not. Until IMAP is
configured, the inbox sync returns `not-configured` and does nothing.

## Follow-up automation

When a quotation or invoice is emailed, a follow-up row is scheduled for three days
later. Unsigned quotes and unpaid invoices are chased every three days, up to three
attempts. Signing a quote or marking an invoice paid cancels the remaining chases.
The scheduler runs inside the web process every 10 minutes (and inbox sync every 15
minutes); staff can also trigger both manually from the Email page. Timers are
`unref`'d so they never keep the process alive on their own.

## PDFs and company details

Quotation and invoice PDFs are generated server-side with `pdf-lib`, mirroring the
supplied invoice layout (Omni Developments Ltd, NatWest 60-15-25 / 65714946). Company
and bank details are read from `site_settings` and can be changed there without a
code release. `invoice_payment_terms_days` controls the default due date.

## Data model safety

- Contacts, quotes, invoices and emails are stored in `crm_*` tables (migration 004).
- Amending a contract never overwrites the signed version: a new row is created with
  `parent_quote_id` and an incremented `version`, and the original is marked `amended`.
- Every email (outbound and inbound) is logged with its status and any SMTP error.

## Local development without MySQL

Without `DATABASE_*` settings the staff lists return empty and mutations return HTTP
503 with a clear message. Configure MySQL and run `npm run db:migrate` (or import
`deploy/schema.sql`) to exercise the full pipeline.