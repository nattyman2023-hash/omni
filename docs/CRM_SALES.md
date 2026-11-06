# Omni CRM — sales documents, e-signature and email

This extends the live PHP CRM (`php/api/crm.php`, staff portal under `/staff`) with:

- **Quotes as contracts**: line items, VAT, terms, PDF, emailing with an e-signature link,
  revisions (a signed quote is never overwritten; a revision is a new version).
- **Invoices**: line items, VAT, stage payments raised from a quote, PDF, emailing, reminders.
- **Email**: send from the CRM over SMTP, pull replies over IMAP, every message logged against the lead.
- **Templates and follow-ups**: editable email templates; unsigned quotes and unpaid invoices are
  chased automatically (every 3 days, at most 3 times) until signed / paid.
- **Company settings**: company, VAT and bank details printed on PDFs.

Leads remain the single customer record; the Contacts page is a view over them (see "Additions").

Everything is implemented in PHP (`php/api/crm_sales.php` plus `php/api/lib/`) because the live
CRM runs on Hostinger PHP hosting. The Express dev server (`server/crm.ts`) does **not** implement
these routes; exercise them through the PHP test harness (`server/php-crm-sales.mysql.test.ts`).

## Configuration (`omni-crm-config.php` on the server)

Put live settings in `omni-crm-config.php` one level above `public_html` so deploys never overwrite them
(Hostinger deploys delete every file inside `public_html` that is not in the package). Copy
`php/api/config.example.php` there and fill it in. Precedence for each key: environment variable >
`../omni-crm-config.php` > `api/config.local.php` (still read, handy for local development) > defaults.

| Key | Example | Purpose |
| --- | --- | --- |
| `OUTBOUND_MESSAGES_ENABLED` | `true` | Master switch. When off, emails are logged as `queued` and never sent. |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | `smtp.hostinger.com` / `465` / `ssl` | `SMTP_SECURE` is `ssl` (implicit TLS), `tls` (STARTTLS) or `none`. |
| `SMTP_USER` / `SMTP_PASSWORD` | mailbox login | |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` / `EMAIL_REPLY_TO` | `admin@omnidevelopment.co.uk` | Sender shown to customers. |
| `IMAP_HOST` / `IMAP_PORT` / `IMAP_USER` / `IMAP_PASSWORD` / `IMAP_MAILBOX` | `imap.hostinger.com` / `993` / … / `INBOX` | Inbox sync (needs the PHP `imap` extension, enabled on Hostinger PHP 8.3). |
| `SIGNING_BASE_URL` | `https://crm.omnidevelopment.co.uk` | Origin used in signing links. Defaults to `APP_URL`. |
| `CRM_CRON_SECRET` | 32+ random chars | Enables `GET /api/cron/crm?key=…` for a Hostinger cron job. |

The system never reports an email as sent unless the SMTP server accepted it. Without SMTP settings
(or with `OUTBOUND_MESSAGES_ENABLED` off) the email is stored with status `queued` and an explanatory
`error`.

## Database

`database/migrations/005_crm_sales.sql`. Purely additive and repeatable (column additions are guarded
with `information_schema` checks), so it is safe to run more than once and safe on the live database.
The PHP API applies any pending `005+` migration automatically on the first staff CRM request
(guarded by a MySQL `GET_LOCK`), because Hostinger shared hosting has no migration runner.

## Scheduling

Follow-ups run (a) whenever staff use the CRM, at most every 10 minutes, (b) from the Email page's
"Run follow-ups now", and (c) from `GET /api/cron/crm?key=CRM_CRON_SECRET`, which also syncs the
inbox. Suggested Hostinger cron (every 15 minutes):
`curl -fsS "https://crm.omnidevelopment.co.uk/api/cron/crm?key=…" > /dev/null`

## Zoho Mail (the domain's mail provider)

omnidevelopment.co.uk uses Zoho Mail on Zoho's **UK** data centre (MX `mx.zoho.uk`). Settings:

```php
'OUTBOUND_MESSAGES_ENABLED' => 'true',
'SMTP_HOST' => 'smtppro.zoho.uk', 'SMTP_PORT' => '465', 'SMTP_SECURE' => 'ssl',
'SMTP_USER' => 'admin@omnidevelopment.co.uk', 'SMTP_PASSWORD' => '<Zoho app-specific password>',
'EMAIL_FROM' => 'admin@omnidevelopment.co.uk', 'EMAIL_FROM_NAME' => 'Omni Developments',
'IMAP_HOST' => 'imappro.zoho.uk', 'IMAP_PORT' => '993', 'IMAP_USER' => 'admin@omnidevelopment.co.uk',
'IMAP_PASSWORD' => '<same app-specific password>', 'IMAP_MAILBOX' => 'INBOX',
```

In Zoho Mail: Settings → Mail Accounts → IMAP → enable IMAP access. If two-factor sign-in is on
(recommended), create an app-specific password at accounts.zoho.uk → Security → App passwords and use
that instead of the account password. Zoho only lets you send as the authenticated mailbox or its
verified aliases, so `EMAIL_FROM` must be that mailbox (or an alias of it).

`GET /api/admin/crm/mail-status` and the Email page include a **"Send test email"** action
(`POST /api/admin/crm/mail-test` `{ to }` → `{ result: { ok, stage, message } }`) and a
**"Test inbox connection"** action (`POST /api/admin/crm/imap-test` → same shape). `stage` is one of
`config`, `connect`, `tls`, `auth`, `send`, `done` so a failure says exactly where it broke
(e.g. "Zoho rejected the login — use an app-specific password").

## Additions (v2 of this contract)

These extend the shapes below.

**Contacts.** Leads stay the single customer record, but staff get a **Contacts** page
(`/staff/contacts`) listing every person/company across all stages with search, plus an "Add contact"
form. A contact is created with `POST /leads` (`source: manual`). Leads gain optional fields
`companyName` (≤190) and `contactType` (`'customer' | 'prospect' | 'supplier' | 'other'`, default
`prospect`; becomes `customer` automatically when a quote is accepted or an invoice is paid). Both are
accepted by `POST/PATCH /leads` and returned on `Lead`. `GET /leads?type=` filters by `contactType`.
`POST /leads` must work with just a name plus either an email or phone, and returns `201 { lead }`;
validation errors return 400 with a clear message.

**UK-complete quotes and invoices.** Both gain:
- `customerName`, `customerCompany`, `customerAddress` (multi-line, ≤500), `customerEmail` — editable;
  default from the lead (name, companyName, address + postcode, email) when created.
- Quotes: `quoteDate` (YYYY-MM-DD, default today).
- Invoices: `invoiceDate` (YYYY-MM-DD, default today when issued), `supplyDate` (optional, tax point),
  `poNumber` (optional, ≤80), `paymentTermsDays` (default from settings; `dueAt` = invoiceDate + terms
  unless given).
- Company settings gain `companyNumber` (Companies House) and `companyWebsite`.
- PDFs print: supplier name, address, company number, VAT number (when set), contact details; customer
  block; document number; dates (quote date + valid until / invoice date, supply date, due date); PO
  number; line items with qty, unit price and amount; subtotal, VAT at rate, total; quotes: terms and
  signature block; invoices: payment terms and bank details, "Paid" stamp when paid.

**Editable invoices.** Every invoice field (items, VAT, customer details, dates, notes, stage label,
PO, terms) is editable while the invoice is `draft` or `issued`. Editing an `issued` invoice that was
already emailed sets `sentAt` to null so staff can resend the corrected copy. `paid` and `void`
invoices are read-only except `notes` and `status` (a `paid` invoice can be reopened to `issued`).

## HTTP contract

Staff routes live under `/api/admin/crm` and need a staff session (401 otherwise). Bodies are JSON;
non-GET requests must pass the existing same-origin check. Errors are `{ "message": "…" }` with
400/404/409/410/503 as described. Money is integer pence. `vatRatePercent` is a number such as
`20` or `0` (stored as basis points). Quantities are numbers with up to 2 decimals.

### Shared shapes

```ts
type LineItem = { id?: number; description: string; quantity: number; unitPricePence: number; amountPence: number };
// On input, amountPence is ignored and computed as round(quantity * unitPricePence).
// Totals: subtotalPence = sum(amountPence); vatPence = round(subtotalPence * vatRatePercent / 100);
//         totalPence = subtotalPence + vatPence.

type Quote = {
  id: number; reference: string;            // "Q-0007"; revisions: "Q-0007-v2"
  leadId: number; leadName: string; leadReference: string; customerEmail: string;
  title: string; status: 'draft' | 'sent' | 'accepted' | 'declined' | 'amended';
  items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number;
  amountPence: number;                      // = total (kept for the existing UI and dashboard)
  validUntil: string | null;                // YYYY-MM-DD
  notes: string; terms: string;
  version: number; parentQuoteId: number | null; revisedById: number | null;
  signingUrl: string | null;                // set once emailed; null when amended/declined
  signedName: string; signedAt: string | null;
  sentAt: string | null; decidedAt: string | null; emailedAt: string | null; createdAt: string | null;
};

type Invoice = {
  id: number; reference: string;            // "INV-0004"
  leadId: number | null; leadName: string; leadReference: string; quoteId: number | null;
  customerName: string; customerEmail: string;
  status: 'draft' | 'issued' | 'paid' | 'void';
  items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number;
  amountPence: number;                      // = total
  stageLabel: string;                       // e.g. "Deposit" for a stage payment
  dueAt: string | null; notes: string;
  issuedAt: string | null; paidAt: string | null; sentAt: string | null; createdAt: string | null;
};

type Email = {
  id: number; direction: 'outbound' | 'inbound';
  leadId: number | null; leadName: string; leadReference: string;
  templateKey: string; relatedType: '' | 'quote' | 'invoice'; relatedId: number | null;
  from: string; to: string; subject: string; body: string;  // body is HTML
  status: 'queued' | 'sent' | 'failed' | 'received'; error: string;
  sentAt: string | null; receivedAt: string | null; createdAt: string | null;
};

type EmailTemplate = { key: string; name: string; subject: string; body: string; isActive: boolean; placeholders: string[] };

type Followup = {
  id: number; documentType: 'quote' | 'invoice'; documentId: number; documentReference: string;
  leadId: number | null; leadName: string; templateKey: string;
  dueAt: string | null; status: 'pending' | 'sent' | 'cancelled'; attempts: number; maxAttempts: number; lastSentAt: string | null;
};

type CompanySettings = {
  companyName: string; companyAddress: string; companyEmail: string; companyPhone: string; companyVatNumber: string;
  bankAccountName: string; bankName: string; bankSortCode: string; bankAccountNumber: string;
  paymentTermsDays: number; defaultVatRatePercent: number; quoteTerms: string;
};

type MailStatus = { outboundEnabled: boolean; smtpConfigured: boolean; imapConfigured: boolean; imapAvailable: boolean; cronConfigured: boolean };
```

### Quotes (existing routes, extended)

| Route | Body / result |
| --- | --- |
| `GET /quotes?status=` | `{ records: Quote[] }` |
| `POST /quotes` | `{ leadId, title, items?, vatRatePercent?, amountPence?, status?, validUntil?, notes?, terms? }` → `201 { quote }`. With non-empty `items` the totals are computed; without items `amountPence` is required and becomes a single line item (VAT 0). `vatRatePercent` defaults to the company default; `terms` to the company quote terms. |
| `PATCH /quotes/:id` | Same fields, all optional → `{ quote }`. Changing `items`, `vatRatePercent`, `amountPence` or `terms` on an `accepted` or `amended` quote → `409 "This quote has been signed. Revise it to make changes."` Status side-effects (lead stage, timeline) unchanged. |
| `GET /quotes/:id` | `{ quote }` |
| `GET /quotes/:id/pdf` | `application/pdf` (inline, filename `Q-0007.pdf`) |
| `POST /quotes/:id/send` | `{ message? }` → `{ quote, email }`. Issues the signing token if missing, emails the `quote_issued` template with the PDF attached to the lead's email, sets status `sent` (if `draft`) with the existing side-effects, schedules follow-ups. `400 "Add an email address to the lead first."` when the lead has none. `409` for `accepted`/`declined`/`amended`. |
| `POST /quotes/:id/revise` | → `201 { quote }` (the new draft). Copies items, terms, VAT; `version + 1`, `parentQuoteId` = original, reference `<base>-v<version>`. The original becomes `amended`, its signing link stops working and its follow-ups are cancelled. A quote already `amended` → `409`. |

### Invoices (existing routes, extended)

| Route | Body / result |
| --- | --- |
| `GET /invoices?status=` | `{ records: Invoice[] }` |
| `POST /invoices` | `{ leadId?, quoteId?, customerName?, items?, vatRatePercent?, amountPence?, stageLabel?, status?, dueAt?, notes? }` → `201 { invoice }`. Same items/amount rule as quotes. `dueAt` defaults to today + `paymentTermsDays` when the invoice is issued. |
| `PATCH /invoices/:id` | Same fields optional → `{ invoice }`. Marking `paid` or `void` cancels pending reminders. Editing items on a `paid` invoice → `409`. |
| `GET /invoices/:id` | `{ invoice }` |
| `GET /invoices/:id/pdf` | `application/pdf` |
| `POST /invoices/:id/send` | `{ message? }` → `{ invoice, email }`. Draft → `issued`; emails `invoice_issued` with PDF; schedules `invoice_reminder` follow-ups. `400` when there is no recipient email; `409` when `paid`/`void`. |
| `POST /invoices/from-quote/:quoteId` | `{ stageLabel?, percent? }` → `201 { invoice }` (draft). Without `percent`: copies the quote's items and VAT. With `percent` (1–100): one line `"<stageLabel or 'Stage payment'> — <percent>% of <quote ref>"` at `percent`% of the quote subtotal, same VAT rate. Quote must be `accepted` or `sent`, else `409`. |

### Email, templates, follow-ups, settings

| Route | Body / result |
| --- | --- |
| `GET /emails?leadId=&direction=` | `{ records: Email[] }` newest first, max 500 |
| `POST /emails` | `{ leadId?, to, subject, body }` (`body` plain text) → `201 { email }`. Logs an `email` activity on the lead. |
| `POST /emails/sync` | → `{ result: { status: 'ok' \| 'not-configured' \| 'unavailable' \| 'failed', imported: number, message: string } }`. Inbound mail is matched to a lead by sender address. |
| `GET /email-templates` | `{ templates: EmailTemplate[] }` |
| `PATCH /email-templates/:key` | `{ subject?, body?, isActive? }` → `{ template }` |
| `GET /followups` | `{ records: Followup[] }` |
| `POST /followups/run` | → `{ result: { sent: number, failed: number, cancelled: number } }` |
| `GET /mail-status` | `{ status: MailStatus }` |
| `GET /settings` | `{ settings: CompanySettings }` |
| `PATCH /settings` | owner/admin only → `{ settings }` |

`GET /leads/:id` additionally returns `emails: Email[]` for that lead.

### Public signing (no session; rate limited)

| Route | Result |
| --- | --- |
| `GET /api/sign/:token` | `{ document: SignDocument }`; `404` unknown token; `410` when the quote was amended, declined or has expired (`validUntil` in the past, still unsigned). |
| `GET /api/sign/:token/pdf` | `application/pdf` |
| `POST /api/sign/:token` | `{ name, agree: true }` → `{ document }`. Records name, time, IP and user agent; quote → `accepted` (lead → Won, timeline entry); cancels its follow-ups; sends `quote_accepted` to the customer. Already signed → `409`. |

```ts
type SignDocument = {
  reference: string; title: string; version: number; status: Quote['status'];
  customerName: string; items: LineItem[]; subtotalPence: number; vatRatePercent: number; vatPence: number; totalPence: number;
  validUntil: string | null; notes: string; terms: string; signedName: string; signedAt: string | null;
  company: { name: string; address: string; email: string; phone: string };
};
```

The customer-facing page is `/sign/:token` (React), reachable without signing in, also in the
CRM-only build.

### Template placeholders

`{{lead.name}}`, `{{lead.firstName}}`, `{{company.name}}`, `{{company.phone}}`, `{{company.email}}`,
`{{quote.reference}}`, `{{quote.title}}`, `{{quote.total}}`, `{{quote.validUntil}}`, `{{sign.link}}`,
`{{invoice.reference}}`, `{{invoice.total}}`, `{{invoice.dueDate}}`, `{{invoice.paymentDetails}}`,
`{{message}}` (the optional note typed when sending). Values are HTML-escaped.

Default templates: `quote_issued`, `quote_reminder`, `quote_accepted`, `invoice_issued`,
`invoice_reminder`.
