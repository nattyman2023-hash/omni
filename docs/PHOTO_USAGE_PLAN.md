# Omni Developments — Photograph Usage Plan

Generated 2026-10-22 by `scripts/generate-photo-usage-plan.cjs`.

Covers every one of the **70 unique supplied photographs**: 14 already published,
56 newly optimised and awaiting placement, and 1 byte-identical duplicate that is
deliberately not published twice.

## The governing honesty rule

> A photograph whose **subject has not been confirmed by the owner** may only be
> placed in a **content-neutral slot** — a gallery, rail or strip captioned as
> supplied project photography. It may **never** be placed in a semantic slot that
> asserts a specific room or project type (a "Kitchen renovations" card, for
> example), because the subject cannot be inferred from pixels and must not be
> guessed. Publishing an unverified photo under a specific trade label would be a
> false claim about work Omni may not have done.

This is why 56 photographs are placed in neutral slots rather than being sprayed
across every service card: it uses the whole library while keeping every caption
true.

## Measured orientation constraint

| Group | Portrait (3:4) | Landscape | Total |
| --- | ---: | ---: | ---: |
| Already published | 6 | 8 | 14 |
| Newly optimised | 52 | 4 | 56 |

The unused library is **overwhelmingly portrait**. That has a direct design
consequence:

- Portrait frames belong in **tall cards, rails and grids** — which is how they
  are planned below.
- They must **not** be forced into full-bleed wide heroes. Filling a 21:9 hero
  from a 3:4 frame needs roughly 60% of the image cropped away, which risks
  distortion and misleading framing. Wide slots therefore draw on the small
  landscape pool plus the already-published landscape assets.
- No asset is stretched. Every `<img>` uses `object-fit: cover` inside a
  container whose ratio matches the source, or `contain` where the whole frame
  must be seen.

## Category A — Approved and already published (14)

Subject confirmed by the existing repository audit. These keep their descriptive
filenames and their current routes; the optimisation pipeline measured them but
did not re-encode them, so live imagery is byte-for-byte unchanged.

| Slug | Source photograph | Confirmed subject | Orientation | Live usage in source (grep-verified) |
| --- | --- | --- | --- | --- |
| `about-omni-van` | WhatsApp Image 2026-07-25 at 11.59.05 AM (6).jpeg | Company vehicle — Branded Omni van | landscape 1600×1200 | `client/src/App.tsx`<br>`client/src/pages/AboutPage.tsx` |
| `completed-facade` | WhatsApp Image 2026-07-25 at 11.59.05 AM (10).jpeg | External works — Completed facade | landscape 1328×747 | `client/src/App.tsx`<br>`client/src/data/content.ts`<br>`client/src/pages/HomeExtensionsPage.tsx`<br>`client/src/pages/HomePage.tsx`<br>`database/migrations/002_project_content.sql` |
| `driveway-finish` | WhatsApp Image 2026-07-25 at 11.59.05 AM (9).jpeg | External works — Driveway | landscape 1328×747 | `client/src/data/content.ts`<br>`database/migrations/002_project_content.sql` |
| `garden-beds` | WhatsApp Image 2026-07-25 at 11.59.05 AM (17).jpeg | External works — Garden beds | portrait 1200×1600 | `client/src/data/content.ts`<br>`database/migrations/002_project_content.sql` |
| `garden-landscaping` | WhatsApp Image 2026-07-25 at 11.59.05 AM (1).jpeg | External works — Garden / landscaping | landscape 1024×683 | `client/src/data/content.ts` |
| `home-extension-hero` | WhatsApp Image 2026-07-25 at 11.59.05 AM (15).jpeg | Extension — Extension doors / opening | portrait 1200×1600 | No live reference found in `client/src` or `database` |
| `home-front` | WhatsApp Image 2026-07-25 at 11.59.05 AM (8).jpeg | Property exterior — House front | landscape 1328×747 | `client/src/App.tsx`<br>`client/src/data/content.ts`<br>`client/src/pages/AboutPage.tsx`<br>`client/src/pages/HomeExtensionsPage.tsx` |
| `insulation-detail` | WhatsApp Image 2026-07-25 at 12.00.28 PM (18).jpeg | Technical detail — Insulation detail | landscape 1600×1200 | `client/src/App.tsx`<br>`client/src/pages/BathroomRenovationsPage.tsx` |
| `insulation-room` | WhatsApp Image 2026-07-25 at 12.00.28 PM (20).jpeg | Technical detail — Insulated room | landscape 1600×1200 | `client/src/data/content.ts`<br>`client/src/pages/BathroomRenovationsPage.tsx`<br>`client/src/pages/HomeExtensionsPage.tsx`<br>`client/src/pages/HomePage.tsx` |
| `interior-stair` | WhatsApp Image 2026-07-25 at 11.59.05 AM (2).jpeg | Interior detail — Stair / interior | portrait 1200×1600 | `client/src/data/content.ts`<br>`client/src/pages/AboutPage.tsx`<br>`client/src/pages/BathroomRenovationsPage.tsx`<br>`client/src/pages/HomeExtensionsPage.tsx`<br>`client/src/pages/HomePage.tsx`<br>`database/migrations/002_project_content.sql` |
| `project-bathroom-01` | WhatsApp Image 2026-07-25 at 11.59.05 AM.jpeg | Finished bathroom detail — Bathroom | landscape 1024×682 | `client/src/data/content.ts`<br>`client/src/pages/BathroomRenovationsPage.tsx`<br>`client/src/pages/HomePage.tsx`<br>`database/migrations/002_project_content.sql` |
| `site-interior` | WhatsApp Image 2026-07-25 at 11.59.05 AM (4).jpeg | Interior — Kitchen / interior | portrait 1200×1600 | `client/src/App.tsx`<br>`client/src/data/content.ts`<br>`client/src/pages/BathroomRenovationsPage.tsx`<br>`client/src/pages/HomeExtensionsPage.tsx`<br>`client/src/pages/HomePage.tsx`<br>`client/src/pages/HowItWorksPage.tsx`<br>`client/src/pages/ProjectManagerPage.tsx`<br>`client/src/pages/ProjectsPage.tsx`<br>`client/src/pages/ReviewsPage.tsx`<br>`client/src/pages/ServicesPage.tsx`<br>`database/migrations/002_project_content.sql` |
| `timber-frame` | WhatsApp Image 2026-07-25 at 12.00.27 PM.jpeg | Construction progress — Timber frame | portrait 1200×1600 | `client/src/data/content.ts`<br>`client/src/pages/AboutPage.tsx`<br>`database/migrations/002_project_content.sql` |
| `works-site` | WhatsApp Image 2026-07-25 at 12.00.26 PM.jpeg | Construction progress — Site in progress | portrait 1200×1600 | `client/src/data/content.ts`<br>`client/src/pages/AboutPage.tsx`<br>`client/src/pages/BathroomRenovationsPage.tsx`<br>`database/migrations/002_project_content.sql` |

> **Shipped but unreferenced.** 1 published asset —
> `home-extension-hero` (aliases: `extension-doors`, `project-extension-01`, `services-extension`) — is deployed to `public/images`
> (with `-640`, `-960` and JPEG fallback variants) but referenced by no page,
> component or migration. The subject is confirmed, so these are the safest
> candidates to reuse for the neutral slots below rather than reaching for an
> unconfirmed photograph. Nothing here should be deleted without owner sign-off,
> because a deployed deployment package or the database may still reference it.

## Category B — Newly optimised, content-neutral placement (56)

Every one of these is now a production-ready asset with WebP, `-960`, `-640` and
JPEG fallback variants. They are assigned below to neutral slots only. **Each row
still requires owner confirmation before its caption may name a room, trade or
project type.**

| Slug | Source photograph | Orientation | Dimensions | Proposed route | Proposed slot | Owner confirmation |
| --- | --- | --- | --- | --- | --- | --- |
| `omni-a115905-05` | WhatsApp Image 2026-07-25 at 11.59.05 AM (5).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-11` | WhatsApp Image 2026-07-25 at 11.59.05 AM (11).jpeg | portrait | 747×1328 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-12` | WhatsApp Image 2026-07-25 at 11.59.05 AM (12).jpeg | portrait | 747×1328 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-13` | WhatsApp Image 2026-07-25 at 11.59.05 AM (13).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-14` | WhatsApp Image 2026-07-25 at 11.59.05 AM (14).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-16` | WhatsApp Image 2026-07-25 at 11.59.05 AM (16).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a115905-18` | WhatsApp Image 2026-07-25 at 11.59.05 AM (18).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120026-01` | WhatsApp Image 2026-07-25 at 12.00.26 PM (1).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-00` | WhatsApp Image 2026-07-25 at 12.00.28 PM.jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-01` | WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-02` | WhatsApp Image 2026-07-25 at 12.00.28 PM (2).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-03` | WhatsApp Image 2026-07-25 at 12.00.28 PM (3).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-04` | WhatsApp Image 2026-07-25 at 12.00.28 PM (4).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-05` | WhatsApp Image 2026-07-25 at 12.00.28 PM (5).jpeg | portrait | 1200×1600 | `/projects` | Project gallery grid | **REQUIRED** — subject unconfirmed |
| `omni-a120028-06` | WhatsApp Image 2026-07-25 at 12.00.28 PM (6).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-07` | WhatsApp Image 2026-07-25 at 12.00.28 PM (7).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-08` | WhatsApp Image 2026-07-25 at 12.00.28 PM (8).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-09` | WhatsApp Image 2026-07-25 at 12.00.28 PM (9).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-10` | WhatsApp Image 2026-07-25 at 12.00.28 PM (10).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-11` | WhatsApp Image 2026-07-25 at 12.00.28 PM (11).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-12` | WhatsApp Image 2026-07-25 at 12.00.28 PM (12).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-13` | WhatsApp Image 2026-07-25 at 12.00.28 PM (13).jpeg | portrait | 1200×1600 | `/` | Homepage "Recent work" rail | **REQUIRED** — subject unconfirmed |
| `omni-a120028-14` | WhatsApp Image 2026-07-25 at 12.00.28 PM (14).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-15` | WhatsApp Image 2026-07-25 at 12.00.28 PM (15).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-16` | WhatsApp Image 2026-07-25 at 12.00.28 PM (16).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-17` | WhatsApp Image 2026-07-25 at 12.00.28 PM (17).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-19` | WhatsApp Image 2026-07-25 at 12.00.28 PM (19).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-22` | WhatsApp Image 2026-07-25 at 12.00.28 PM (22).jpeg | portrait | 1200×1600 | `/services` | Service process strip | **REQUIRED** — subject unconfirmed |
| `omni-a120028-24` | WhatsApp Image 2026-07-25 at 12.00.28 PM (24).jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-a120028-25` | WhatsApp Image 2026-07-25 at 12.00.28 PM (25).jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-a120028-26` | WhatsApp Image 2026-07-25 at 12.00.28 PM (26).jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-b102715-00` | WhatsApp Image 2026-10-16 at 10.27.15 AM.jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-b102715-01` | WhatsApp Image 2026-10-16 at 10.27.15 AM (1).jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-b102715-02` | WhatsApp Image 2026-10-16 at 10.27.15 AM (2).jpeg | portrait | 1200×1600 | `/reviews` | Project photography beside testimonials | **REQUIRED** — subject unconfirmed |
| `omni-b102715-03` | WhatsApp Image 2026-10-16 at 10.27.15 AM (3).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-04` | WhatsApp Image 2026-10-16 at 10.27.15 AM (4).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-05` | WhatsApp Image 2026-10-16 at 10.27.15 AM (5).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-06` | WhatsApp Image 2026-10-16 at 10.27.15 AM (6).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-07` | WhatsApp Image 2026-10-16 at 10.27.15 AM (7).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-08` | WhatsApp Image 2026-10-16 at 10.27.15 AM (8).jpeg | portrait | 1200×1600 | `/areas` | Local works grid | **REQUIRED** — subject unconfirmed |
| `omni-b102715-09` | WhatsApp Image 2026-10-16 at 10.27.15 AM (9).jpeg | portrait | 1200×1600 | `/how-it-works` | Stage cards | **REQUIRED** — subject unconfirmed |
| `omni-b102715-10` | WhatsApp Image 2026-10-16 at 10.27.15 AM (10).jpeg | portrait | 1200×1600 | `/how-it-works` | Stage cards | **REQUIRED** — subject unconfirmed |
| `omni-b102715-11` | WhatsApp Image 2026-10-16 at 10.27.15 AM (11).jpeg | portrait | 1200×1600 | `/how-it-works` | Stage cards | **REQUIRED** — subject unconfirmed |
| `omni-b102715-12` | WhatsApp Image 2026-10-16 at 10.27.15 AM (12).jpeg | portrait | 1200×1600 | `/how-it-works` | Stage cards | **REQUIRED** — subject unconfirmed |
| `omni-b102715-13` | WhatsApp Image 2026-10-16 at 10.27.15 AM (13).jpeg | portrait | 1200×1600 | `/how-it-works` | Stage cards | **REQUIRED** — subject unconfirmed |
| `omni-b102715-14` | WhatsApp Image 2026-10-16 at 10.27.15 AM (14).jpeg | portrait | 1200×1600 | `/guides` | Article figures | **REQUIRED** — subject unconfirmed |
| `omni-b102715-15` | WhatsApp Image 2026-10-16 at 10.27.15 AM (15).jpeg | portrait | 1200×1600 | `/guides` | Article figures | **REQUIRED** — subject unconfirmed |
| `omni-b102715-16` | WhatsApp Image 2026-10-16 at 10.27.15 AM (16).jpeg | portrait | 1200×1600 | `/guides` | Article figures | **REQUIRED** — subject unconfirmed |
| `omni-b102715-17` | WhatsApp Image 2026-10-16 at 10.27.15 AM (17).jpeg | portrait | 1200×1600 | `/guides` | Article figures | **REQUIRED** — subject unconfirmed |
| `omni-b102715-18` | WhatsApp Image 2026-10-16 at 10.27.15 AM (18).jpeg | portrait | 1200×1600 | `/guides` | Article figures | **REQUIRED** — subject unconfirmed |
| `omni-b102715-19` | WhatsApp Image 2026-10-16 at 10.27.15 AM (19).jpeg | portrait | 1200×1600 | `/about` | On-site imagery | **REQUIRED** — subject unconfirmed |
| `omni-b102716-00` | WhatsApp Image 2026-10-16 at 10.27.16 AM.jpeg | portrait | 1200×1600 | `/about` | On-site imagery | **REQUIRED** — subject unconfirmed |
| `omni-a115905-03` | WhatsApp Image 2026-07-25 at 11.59.05 AM (3).jpeg | landscape | 1024×683 | `/contact` | Wide reassurance panel | **REQUIRED** — subject unconfirmed |
| `omni-a115905-07` | WhatsApp Image 2026-07-25 at 11.59.05 AM (7).jpeg | landscape | 1328×747 | `/contact` | Wide reassurance panel | **REQUIRED** — subject unconfirmed |
| `omni-a120028-21` | WhatsApp Image 2026-07-25 at 12.00.28 PM (21).jpeg | landscape | 1600×1200 | `/quote` | Wide reassurance panel | **REQUIRED** — subject unconfirmed |
| `omni-a120028-23` | WhatsApp Image 2026-07-25 at 12.00.28 PM (23).jpeg | landscape | 1600×1200 | `/quote` | Wide reassurance panel | **REQUIRED** — subject unconfirmed |

### Slot summary

| Route | Slot | Shape | Photographs | Rationale |
| --- | --- | --- | ---: | --- |
| `/projects` | Project gallery grid | portrait | 14 | 3:4 cards in a masonry-style grid; the library is portrait-dominant so this is its natural home |
| `/` | Homepage "Recent work" rail | portrait | 8 | Horizontally scrollable portrait card rail, replaces the current repeated imagery |
| `/services` | Service process strip | portrait | 6 | Neutral "how a project runs" strip, not tied to a named trade |
| `/reviews` | Project photography beside testimonials | portrait | 6 | Pairs a photo with a review without claiming the photo is that customer's home |
| `/areas` | Local works grid | portrait | 6 | Captioned as supplied project photography across the coverage area |
| `/how-it-works` | Stage cards | portrait | 5 | Illustrates process stages neutrally |
| `/guides` | Article figures | portrait | 5 | In-body figures for guide pages |
| `/about` | On-site imagery | portrait | 2 | Supports the about narrative |
| `/contact` | Wide reassurance panel | landscape | 2 | One of only four landscape frames available, so it is spent on the widest slot |
| `/quote` | Wide reassurance panel | landscape | 2 | Shares the landscape pool with /contact |
| **Total** | | | **56** | |

## Category C — Semantic slots held for owner confirmation

These slots assert a specific trade or room, so they stay on Category A
photography until the owner confirms which supplied frame actually shows that
work. They must not be filled from Category B.

| Slot | Current asset | Why it is held |
| --- | --- | --- |
| Kitchen renovations card | `services-kitchen` (alias of `site-interior`) | Only one interior frame is catalogued as a kitchen; a second cannot be verified |
| Bathroom renovations card | `services-bathroom` (alias of `project-bathroom-01`) | Single confirmed bathroom frame |
| Loft conversions card | `services-loft` (alias of `interior-stair`) | Currently a stair/interior frame standing in for a loft |
| Home extensions card | `services-extension` (alias of `home-extension-hero`) | Single confirmed extension frame |
| Any before/after slider | none | 0 verified pairs — see `docs/BEFORE_AFTER_EVIDENCE.md` |

> **Flagged for the owner:** the loft conversions card currently shows a
> stair/interior photograph. That is a pre-existing inaccuracy in the live site,
> not one introduced here, and it should be corrected with a genuine loft photo.

## Category D — Duplicate, not published (1)

| File | Duplicate of | Action |
| --- | --- | --- |
| WhatsApp Image 2026-10-16 at.jpeg | WhatsApp Image 2026-10-16 at 10.27.15 AM.jpeg | Not published. Identical SHA-256, so a second asset would waste bandwidth and inflate the apparent size of the library |

## Naming convention

New assets are named from the WhatsApp capture timestamp, for example
`WhatsApp Image 2026-07-25 at 12.00.28 PM (1).jpeg` becomes `omni-a120028-01`:

- `omni-` — project prefix
- `a` / `b` — shoot batch (`a` = 2026-07-25, `b` = 2026-10-16)
- `120028` — 24-hour capture time
- `-01` — position within that capture group

All lowercase ASCII, no spaces, brackets or extra dots. A timestamp-derived name
is used instead of a running index so slugs stay stable when new photographs are
added, and so any asset traces back to its source without a lookup table.

Descriptive names such as `kitchen-renovation-02` are deliberately **not** invented
for unconfirmed subjects. Once the owner confirms a subject, add the slug to
`PUBLISHED_SLUGS` in `scripts/optimize-photos-config.cjs` and re-run the pipeline.

## Optimisation guarantees

- Originals in `Photos/` are never moved, renamed, resized, re-encoded or deleted.
- Each asset ships as WebP (quality 78, effort 6) plus `-960` and `-640` variants
  and a JPEG fallback.
- Nothing is upscaled: a variant is skipped when the source is already narrower.
- Aspect ratio is always preserved; no crop is applied during optimisation.
- Measured result: base WebP files are **17.6% smaller** than the source JPEGs at
  identical dimensions, before the much larger savings from responsive variants.
- A slug-collision guard aborts the run rather than silently overwriting assets.

## Rollout checklist

1. Owner confirms subjects for the Category B rows they want promoted to semantic
   slots, and supplies a genuine loft photograph.
2. Owner identifies any true before/after pair and sets `approved: true` in
   `client/src/data/beforeAfter.ts`.
3. UI implementation consumes `client/src/data/photoAssets.ts` so every `<img>`
   carries measured `width`/`height` and a `srcSet` built from the real variants.
4. Re-run `node scripts/optimize-photos.cjs` after any rename, then run tests,
   lint, typecheck and build.
