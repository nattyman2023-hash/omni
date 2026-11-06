# Omni CRM

The staff portal (`/staff`) is Omni's CRM. The public website runs on WordPress
(omnidevelopment.co.uk). This app is hosted separately, for example at
`crm.omnidevelopment.co.uk`, and receives the website's enquiries through a signed webhook.

## What staff can do

| Area | What it does |
| --- | --- |
| Dashboard (`/staff`) | Shows new leads this week, open leads with their estimated value, quotes awaiting an answer, outstanding and overdue invoices, open and overdue tasks, win rate, a count per stage, new leads still to contact, upcoming visits, follow-ups and recent activity. |
| Leads (`/staff/leads`) | A board with one column per stage. Drag a card to change its stage. A list view adds filters, and search covers name, phone, email, postcode and reference. Leads can also be added by hand. |
| Lead page (`/staff/leads/:id`) | Contact buttons (call, WhatsApp, email), a stage bar with "mark lost" and a reason, editable details including estimated value and assignee, and the original website submission. Also lists the lead's site visits, tasks, quotes and invoices, plus an activity timeline of notes, logged calls and emails, and every automatic change. |
| Site visits | Book, re-schedule, complete or cancel visits, with an address, duration and attending staff member. |
| Tasks | Follow-ups with an optional due date, assignee and linked lead. Overdue tasks are highlighted. |
| Quotes | Q-0001 style numbering, with amount, valid-until date and status (draft, sent, accepted, declined). |
| Invoices | INV-0001 style numbering. An invoice can be linked to an accepted quote. Statuses are draft, issued, paid and void, and overdue is worked out from the due date. |
| Calendar | A month view and agenda of site visits and task due dates. |

### Automatic pipeline rules

These are the same in the Express and PHP versions.

- Logging a call or an email on a **New** lead moves it to **Contacted**.
- Booking a site visit moves the lead to **Site visit**.
- Marking a quote **Sent** moves the lead to **Quoted**.
- Marking a quote **Accepted** moves the lead to **Won**.
- Automatic moves only go forward. They never move a lead out of Won or Lost. Staff can still set any stage by hand, including reopening a lost lead.
- Every change is recorded on the lead's timeline, with the staff member's name.

## Where leads come from

1. **WordPress (Elementor forms).** The *Omni CRM Connector* plugin
   (`wordpress/omni-crm-connector/`) posts each submission to
   `POST /api/integrations/wordpress/lead`.
2. **This app's own `/contact` and `/quote` forms**, if it is used as the public site. Each
   submission is copied into the CRM the next time staff open it, and keeps its ENQ-/QTE- reference.
3. **Added by hand** in the portal.

Each WordPress submission is identified as `elementor:{site}:{submission id}`. Sending the same
submission again is safe: the CRM replies `200 {"created": false}` and does not create a
duplicate lead.

## Setup

1. **Database.** On an existing database, apply `database/migrations/004_crm_pipeline.sql`
   with `npm run db:migrate`. On a fresh Hostinger database, import `deploy/schema.sql`.
2. **Secret.** Generate one with `openssl rand -hex 32` and set it as `CRM_WEBHOOK_SECRET`:
   - PHP hosting: in `php/api/config.local.php` (it is already listed in `config.example.php`).
   - Node hosting: as an environment variable.

   Without this secret the webhook answers 503.
3. **WordPress plugin.**
   1. Zip the `wordpress/omni-crm-connector` folder and upload it under Plugins → Add New → Upload.
   2. Activate it.
   3. Under **Settings → Omni CRM**, enter:
      - CRM webhook URL: `https://<crm-host>/api/integrations/wordpress/lead`
      - Shared secret: the same value as `CRM_WEBHOOK_SECRET`

      Instead of using the settings page, you can define `OMNI_CRM_ENDPOINT` and `OMNI_CRM_SECRET` in `wp-config.php`.
   4. Click **Test connection**. A success message means the signature was accepted.
   5. Click **Send existing submissions** to import enquiries that arrived before the plugin was installed.

   Failed deliveries are queued and retried every hour. The last 10 delivery results are shown on the settings page.

### Webhook contract

```
POST /api/integrations/wordpress/lead
Content-Type: application/json
X-Omni-Timestamp: <unix seconds>                     (must be within 5 minutes)
X-Omni-Signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>

{ "externalId": "elementor:omnidevelopment.co.uk:42", "form": "Full quote", "page": "Contact",
  "site": "omnidevelopment.co.uk", "submittedAt": "2026-10-28T16:17:46Z",
  "fields": { "name": "…", "email": "…", "phone": "…", "postcode": "…", "project": "…",
              "property": "…", "start": "…", "budget": "…", "plans": "…", "message": "…",
              "contact_pref": "…" } }
```

Responses: `201` created, `200` already received, `400` invalid or empty submission,
`401` bad or expired signature, `503` secret not configured.

Field names are matched loosely, so other forms work too. Examples: `first_name` plus `last_name`,
`telephone`, `post_code`, `service`, `details`. The complete original submission is stored and
shown on the lead page.

## Staff API (signed-in session required)

All routes live under `/api/admin/crm`:

- `GET /summary`
- `GET /staff`
- `GET /leads` / `POST /leads` (GET accepts `?stage=` and `?q=`)
- `GET|PATCH /leads/:id`
- `POST /leads/:id/activities`, with body `{kind: note|call|email, body}`
- `GET|POST /visits|tasks|quotes|invoices` (GET accepts `?status=`)
- `PATCH /visits|tasks|quotes|invoices/:id`
- `GET /team`, `POST /team`, `PATCH /team/:id`, `POST /team/:id/password`

Money is always sent and stored as integer pence. Date-times are ISO-8601 UTC. Plain dates are
`YYYY-MM-DD`.

### Team accounts

`/team` manages the `users` table that staff sign in with: owners (and administrators) only, `403`
for anyone else. `GET /team` returns every account including deactivated ones, with
`{id, name, email, role, isActive, createdAt, lastSeenAt}`; the password hash is never returned.

- `POST /team` with `{name, email, role, password}` creates an account. `role` is
  `owner|admin|staff` (default `staff`), emails are stored lower-cased, passwords must be at least
  12 characters and are bcrypt-hashed (cost 12 in production). A duplicate email returns `409`.
- `PATCH /team/:id` with any of `{name, email, role, isActive}` updates the account. You cannot
  change your own role or deactivate yourself, and the last active owner cannot be demoted or
  deactivated. Deactivating ends that account's sessions immediately.
- `POST /team/:id/password` with `{password}` sets a new password and signs the account out
  everywhere, so the new password is needed straight away.

The team screen is at `/staff/team` and only appears in the navigation for owners and
administrators. Staff accounts still use `GET /staff` to pick an assignee for leads, tasks and
visits.

### Lead attachments

Website quote requests can include drawings. `GET /leads/:id` returns `files` as
`{id, originalFilename, mimeType, sizeBytes, createdAt}`; the on-disk name is never exposed.

`GET /leads/:id/files/:fileId` streams one attachment (PDF, JPEG, PNG or WebP) from the private
upload directory with `Content-Disposition: attachment`. The file id is scoped to the lead's own
quote request, so a file can never be fetched through another lead. The lead page lists the files
with download links.

### Exports

- `GET /leads.csv` honours the same `?stage=` and `?q=` filters as `GET /leads`
- `GET /invoices.csv` honours `?status=`

Both are RFC 4180 CSV with CRLF rows and a UTF-8 BOM so Excel reads them correctly. Money is
exported in pounds to two decimal places (`1250.50`), not pence. The leads and invoices pages have
an **Export CSV** button that keeps the current filters.

### Erasing personal data (GDPR)

`DELETE /leads/:id` removes a customer's personal data:

- no quotes or invoices: the lead is deleted, and its activity, visits, tasks and quotes cascade
- quotes or invoices exist: the lead is anonymised (name replaced, email/phone/postcode/address,
  description, budget and the original submission cleared; visit addresses and task notes cleared)
  and an activity entry records the erasure. Quotes and invoices are kept for accounting.

The lead page offers this as **Erase personal data** behind two confirmations.

### Possible duplicates

`GET /leads` and `GET /leads/:id` include `possibleDuplicates`, a list of `{id, name, reference}`
for other leads sharing that lead's email address (case-insensitive) or phone number (digits only,
with `+44…` and `0…` treated as the same number). The lead list and lead page show the hint;
nothing is merged automatically.

Implementations:

- `server/crm.ts` (Express). It uses MySQL, or an in-memory store for local development without a database. Tests are in `server/crm.test.ts`.
- `php/api/crm.php` (Hostinger PHP). Same contract and rules.
