# Real content required before production

The public build uses neutral copy or managed empty states where approved factual
content was not available. These items must be supplied and approved before a
production launch:

- Owner-approved privacy, cookies and terms wording.
- Confirmed legal company name, registration number and publishable address.
- Confirmed public phone, email, WhatsApp and social links.
- Verified service inclusions, FAQs, guarantees and programme wording.
- Verified project names, locations, scope, status, image captions and gallery relationships.
- Permissioned customer reviews, names/initials, locations and review sources.
- Guide authorship and publication dates.
- Documentary evidence for accreditations, insurance, awards, statistics and ratings.
- Staff user email, bcrypt password hash and password-reset process.
- Email provider, sender, notification recipient and failure-handling contact.
- Enquiry/file retention period, deletion process and CRM workflow owners.

## Current safe public states

- `/reviews` shows an approval state and no rating summary, star score or invented review.
- Homepage, services, project and review photography panels use supplied images without
  asserting an unverified project, customer or location record.
- `/projects` and `/reviews` do not present any two photographs as a before/after pair.
- `/about` lists no named staff until owner-approved profiles are supplied.
- The `/areas` map is a local visual coverage asset with an accessible HTML area list;
  it is not a live GPS, radius or dispatch-time promise.
- Accreditation, warranty, insurance, rating and legal identity fields are gated in
  `client/src/data/content.ts` and remain disabled until verified.

## Owner content workflow

Approved project records can now be reviewed and maintained at `/staff/projects`.
The project editor supports title, URL slug, category, location label, verified
description, local image paths, multi-image upload, gallery ordering, tags and a
publish/draft/archive state. Only published records are returned to the public
project pages. MySQL is required for edits to survive an application restart;
without it, the local workspace clearly labels edits as session-only preview data.

The project migration is `database/migrations/002_project_content.sql` and is safe
to rerun. Do not enable a claim flag or publish a review until its evidence and
permission are recorded. The remaining services, guides, areas, reviews and legal
content still require owner approval before production use.

## Photo notes

`PHOTO_MAPPING.md` is the source-of-truth table for displayed image files, optimized
variants, alt text and verification status. The supplied photographs are visual
context only; all project/location verification flags are currently `No`.

## Blocking configuration

The strict persistence suite requires a disposable MySQL database through
`TEST_DATABASE_*`; it refuses the live/production database and matching test and
production configurations. No disposable connection was available during the local
Phase 1 run. Supply test-only values and run `npm run build` followed by
`npm run test:mysql` before treating Phase 1 as complete.
