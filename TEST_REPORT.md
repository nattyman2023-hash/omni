# Omni Development final pre-deployment review

## Phase 1 durable-lead update — 2026-10-11

Phase 1 code is implemented but is not complete until the strict disposable-MySQL
persistence suite passes. Current results:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed: client, server and test TypeScript |
| `npm test` | Passed: generated-schema drift check plus 2 files / 6 tests |
| `npm run build` | Passed; existing bundle-size warning remains |
| Production without MySQL | Passed: health is HTTP 503/degraded; contact and quote APIs return the honest storage-unavailable response and do not use memory |
| `npm run test:mysql` | Awaiting a disposable database through required `TEST_DATABASE_*` variables; the suite fails closed rather than skipping |

The ordered files in `database/migrations` are authoritative. `deploy/schema.sql`
is deterministically generated from them, and `npm test` rejects drift. The quote
file foreign key remains `quote_request_files.quote_request_id ->
quote_requests.id ON DELETE CASCADE`.

The MySQL suite applies those migrations, exercises a contact, quote and file row,
creates and edits a project, restarts the built server, and then verifies every row
directly. It rejects missing test settings, unsafe database names, a normal
production database name, and identical test/production configurations. It has not
been weakened or skipped.

The previous Hostinger ZIP is superseded and must not be uploaded. Its replacement,
`deployment/omni-hostinger-phase1-mysql-verification-20261011.zip`, is a test
candidate only until the disposable MySQL suite passes.

## Temporary Hostinger preparation update — 2026-10-11

Preparation is isolated on branch `hostinger-temporary-review`; nothing was
deployed, pushed or connected to the live Omni domain or database.

Current verification:

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` | Passed: 1 file, 3 tests |
| `npm run build` | Passed; bundle-size warning remains |
| Production-shaped staging start | Passed on `process.env.PORT=3202`, bound by the application to `0.0.0.0` |
| Required direct routes | Passed: 12/12 returned HTTP 200 |
| Browser/layout/Axe suite | Passed: 60 screenshots, 60 layout checks, 60 accessibility checks, 0 failures |
| Public contact and quote UI | Passed in the development-only memory fallback; quote double-submit protection passed |
| Staff authentication/project workflow | Passed in the isolated local authentication test |
| Staging protection | Passed: response `X-Robots-Tag`, blocking `robots.txt`, safe health response and outbound messaging disabled |
| MySQL-backed public forms | **Blocked locally:** no disposable MySQL service or credentials were available |
| Upload persistence after redeploy | **Blocked:** requires verification on the new Hostinger temporary application storage |

This historical temporary-preparation result is superseded by the Phase 1 update
above. The current first-install database file is `deploy/schema.sql`, intended for
a new Hostinger database only.
Static review confirms conditional table creation, guarded seed inserts, migration
history records and cascading foreign keys for quote files, project media and
project tags. Runtime import and second-import verification remain required in the
new temporary MySQL database before acceptance.

Date: 2026-09-07

Status: **INCOMPLETE for Hostinger temporary deployment**; **READY FOR OWNER VISUAL
REVIEW** locally. Real local MySQL/MariaDB persistence and the new Hostinger
configuration still require verification. Nothing was deployed or pushed.

## Final command suite

| Command | Result |
| --- | --- |
| `npm test` | Passed: 1 file, 3 tests |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed: client and server TypeScript |
| `npm run build` | Passed: Vite client and compiled Express server |
| `npm start` | Passed in production-shaped staging mode on port 3202; `/health` and direct route smoke checks returned successfully |
| `npm run db:migrate` | Blocked safely: no local Docker/MySQL/MariaDB executable and no `DATABASE_*` values configured |

## Pages visually checked

Playwright Chromium captured every required route at 390x844 mobile, 768x1024
tablet and 1440x1000 desktop: `/`, `/services`, `/services/home-extensions`,
`/services/bathroom-renovations`, `/projects`, `/projects/open-plan-extension`,
`/how-it-works`, `/about`, `/reviews`, `/areas`, `/areas/manchester`, `/guides`,
`/guides/greater-manchester-home-extension-guide`, `/contact`, `/quote`,
`/privacy`, `/cookies`, `/terms`, `/staff/login` and `/404-test`.

Final capture audit: 60/60 completed against the rebuilt production-shaped server,
with zero page errors, zero horizontal overflow defects and zero legacy headers.
Focused project captures cover all three supplied project slugs at desktop, tablet
and mobile sizes, with the same shared gallery heading/viewer and no overflow.
Focused feature captures also cover the desktop Services mega menu, mobile drawer,
repaired generic service process and staff project workspace.

## Issues found and corrected

- Restored the normal Tailwind `sm`, `md`, `lg`, `xl` breakpoints. The previous
  configuration had replaced them with only `2xl`, collapsing responsive Stitch
  grids into long single-column layouts.
- Added the missing responsive card treatment to the generic six-step service
  timeline: 3 columns desktop, 2 tablet and 1 mobile.
- Improved project cards with stable image ratios, equal-height card bodies and
  consistent spacing at mobile, tablet and desktop widths.
- Replaced the congested desktop header with two direct links and grouped Services,
  Projects and About Us mega menus. The menu supports click, hover, keyboard focus
  and Escape dismissal; mobile keeps a dedicated full-height, scrollable drawer with
  complete grouped Services, Projects, About Us and Contact links.
- Rebalanced the homepage Recent Projects section: the filter row now exposes only
  categories represented by published projects, the three supplied cards fill a
  three-column desktop row, and the gallery link has a clearer separated arrow.
  Project-card images load eagerly so a first visual render cannot show blank image
  frames while below-fold lazy images decode.
- Replaced hard-coded public project reads with a published project feed and added
  `/staff/projects` for project title, slug, category, location, description, local
  image paths, gallery paths, tags and publish/draft/archive state.
- Made `ProjectGallery` the shared gallery viewer for every project detail page. The
  CRM main image is normalized to frame one, duplicate/empty paths are removed,
  gallery order is preserved, and the finite supplied project image set is decoded
  before visual capture so no dark placeholder frames appear in the finished page.
- Added CRM gallery order controls for moving or removing image paths, with a clear
  owner-facing note that only Published records are returned to the public feed.
- Added the authenticated `/api/admin/project-images` upload endpoint and CRM
  multi-image picker. JPG, PNG and WebP uploads are stored as safe local project
  assets and added to the editable gallery order.
- Corrected two serious bathroom-card contrast findings by replacing nearly
  invisible decorative phase numbers with the approved dark text token.
- Preserved the navy, cream/light-surface and orange/gold Omni design system,
  supplied local imagery, explicit image dimensions and safe image fallbacks.

Remaining intentional differences from Stitch are supplied local photography in
place of remote Stitch imagery, neutral owner-approval states and cautious copy
where verified project or company information is unavailable.

## CMS / CRM project workflow

The project workspace is available after staff login at:

`http://localhost:3000/staff/projects`

The API is database-ready:

- `GET /api/projects` returns published records for the public site.
- `GET /api/admin/projects` lists published, draft and archived records for staff.
- `POST /api/admin/projects` creates a record.
- `PATCH /api/admin/projects/:id` edits and publishes/drafts a record.
- `DELETE /api/admin/projects/:id` archives a record rather than deleting it.
- `POST /api/admin/project-images` accepts up to eight authenticated JPG, PNG or
  WebP project images and returns their local `/uploads/projects/...` paths.

All staff endpoints require the existing staff session cookie. Image paths are
restricted to approved local `/images/` or `/uploads/` paths. `002_project_content.sql`
adds the project tags table and safely seeds the supplied project records. The
public detail route is one shared template for every published slug; publishing,
unpublishing, archiving and gallery order are controlled by the workspace.

## Functional QA evidence

The final Chromium run completed 60 route/viewport captures, 60 layout checks and
60 Axe checks. Mobile menu, service filter, accordion, contact submission and the
full six-step quote wizard passed. Staff login, authenticated API access and logout
invalidation also passed. The quote wizard made exactly one POST after a double-click
and generated reference `QTE-E5141310B3`; refresh of the confirmation page did not
resubmit it.

The temporary-review safeguards were also checked on an isolated local port:
`/health` returned a safe process-only response, `X-Robots-Tag` was
`noindex, nofollow, noarchive`, `robots.txt` disallowed crawling, matching client
robots metadata was present, and authenticated staff showed the Temporary review
site marker.

The targeted homepage review also passed: the Recent Projects filters rendered only
`All`, `Extensions`, `Renovations` and `Bathrooms`; selecting Bathrooms returned one
matching card, the gallery arrow link was visible, and desktop/mobile overflow was 0px.

The isolated local CMS test used temporary credentials and a separate port. The
CRM gallery reorder/remove controls and browser image upload passed, and the API
workflow passed:

`401 unauthorised -> 201 create -> 404 draft hidden -> 200 publish -> 200 visible ->
200 archive -> 404 archived hidden -> 401 post-logout`

The temporary QA record was archived before the test ended. No temporary credential
was used for production.

## Database status

Database persistence is **not yet verified** because no disposable
`TEST_DATABASE_*` connection is configured. The Phase 1 suite is implemented and
must pass unchanged before this phase can be marked complete. MySQL, MariaDB and
Docker were not installed automatically, and the live Omni database was not used.

Without MySQL, the project workspace clearly labels changes as **Preview storage
only** and those changes are session-only. Do not claim CRM persistence or mark the
site ready for Hostinger until a safe local database run verifies the rows directly.

## Accessibility results

The final `@axe-core/playwright` audit covered all 20 routes at all three viewports:
60 scans, **0 violations**, including 0 serious or critical violations. Keyboard
menu dismissal, named buttons, form labels, focus indicators, quote validation,
upload removal and mobile navigation passed.

Lighthouse also reported 100 accessibility on all five performance routes.

## Performance results

Saved reports: `qa/lighthouse/final-home.json`, `final-service.json`,
`final-project.json`, `final-contact.json` and `final-quote.json`.

| Route | Performance | Accessibility | Best practices | SEO | FCP | LCP | CLS | TBT | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 58 | 100 | 100 | 100 | 6.4 s | 7.8 s | 0.084 | 90 ms | 1,375 KiB |
| `/services/home-extensions` | 60 | 100 | 100 | 100 | 6.2 s | 7.2 s | 0.011 | 70 ms | 805 KiB |
| `/projects/open-plan-extension` | 55 | 100 | 100 | 100 | 6.3 s | 7.7 s | 0.001 | 260 ms | 807 KiB |
| `/contact` | 59 | 100 | 100 | 100 | 6.3 s | 7.2 s | 0.001 | 170 ms | 823 KiB |
| `/quote` | 60 | 100 | 100 | 100 | 6.3 s | 6.3 s | 0 | 160 ms | 700 KiB |

The main remaining performance opportunity is the single approximately 542 KiB
minified JavaScript chunk and font startup under Lighthouse throttling. The image
audit found no broken or remote images, and the measured layout shift is low.

## Content and image audit

`qa/image-report.json` records 93 rendered image requests across the 20 audited
routes: zero failed requests, non-2xx image responses, broken images, remote image
URLs or Windows absolute-path URLs.

`PHOTO_MAPPING.md` records displayed page, section, source filename, optimized
filename, alt text and verification state. No photograph is presented as a before/
after pair without a confirmed relationship. Public application paths contain no
visible Lorem/demo/sample customer content, fake ratings, invented reviews,
debug logging, TODO/FIXME or Coming Soon markers. Reference Stitch HTML and test
fixtures remain unchanged.

## Real content still required

See [REAL_CONTENT_REQUIRED.md](REAL_CONTENT_REQUIRED.md) for the owner handoff:
owner-approved legal identity/address/copy, verified project/location descriptions,
approved review text and ratings, documentary accreditation/insurance/warranty
evidence, staff credentials, email provider settings, database credentials,
retention rules and CRM workflow ownership.

## Evidence locations

- Screenshots: `visual-qa/current/` (including `header-1440.png`,
  `recent-projects-1440.png` and `mobile-header-menu-390.png`)
- Project template screenshots: `visual-qa/current/project-template-1440.png`,
  `visual-qa/current/390x844-project-open-plan-extension.png`,
  `visual-qa/current/768x1024-project-open-plan-extension.png` plus the matching
  property-improvements and bathroom-installation captures
- Browser/Axe report: `qa/playwright-report.json`
- Browser screenshots: `qa/screenshots/`
- Image audit: `qa/image-report.json`
- Lighthouse reports: `qa/lighthouse/final-*.json`
- Photo mapping: `PHOTO_MAPPING.md`
- Missing/owner content handoff: `REAL_CONTENT_REQUIRED.md`
- Hostinger package: `deployment/omni-hostinger-phase1-mysql-verification-20261011.zip`
  (verification candidate; not a final upload until MySQL persistence passes).

## Owner local review commands

From `C:\Users\Natty\Desktop\Anti Grav\Omni`:

```powershell
npm install --no-audit --no-fund --strict-ssl=false
npm run build
$env:ADMIN_EMAIL='your-owner-email'
$env:ADMIN_PASSWORD_HASH='your-bcrypt-password-hash'
$env:EMAIL_PROVIDER='your-provider'
$env:EMAIL_API_KEY='your-key'
$env:EMAIL_FROM='your-sender'
$env:ADMIN_NOTIFICATION_EMAIL='your-notification-recipient'
npm start
```

Open `http://localhost:3000/`, then open `http://localhost:3000/staff/projects` to
review the project workflow. The current QA server is already running on port 3000.
Stop it with Ctrl+C when finished. Do not deploy or push this build.
