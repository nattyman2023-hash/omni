# Omni Developments — Before / After Evidence Report

Generated 2026-10-22 by `scripts/generate-before-after-evidence.cjs`.

## Headline conclusion

> **0 VERIFIED pairs. 0 HIGH-confidence pairs. 0 pairs approved for public slider use.**

No two photographs in the supplied library show the same scene from the same
camera position. The site therefore publishes **no** before/after transformation
story. The `BeforeAfterComparison` component is built and tested, but is gated
behind an explicit owner-approval flag so it cannot render an unverified pair.

## Method

Before/after pairing cannot be judged from filenames alone — every supplied file
is named `WhatsApp Image <date> at <time> (n).jpeg`, which carries no project,
room or stage information. Pairing was therefore tested against reproducible
technical signals only:

1. **DCT perceptual hash (pHash).** Each frame is centre-cropped to a square,
   reduced to 32×32 greyscale, DCT-transformed, and the 8×8 low-frequency block
   is median-thresholded into a 63-bit signature.
2. **Pairwise Hamming distance** across all 2,485 combinations of 71 files.
3. **Colour-histogram correlation** (16 bins per RGB channel).
4. **Luminance delta** between frames.
5. **Aspect-ratio equality** and **WhatsApp send-order adjacency**.
6. **EXIF capture metadata** — absent from every file (stripped by WhatsApp).

## Thresholds and why

| Hamming distance (of 63) | Interpretation | Confidence |
| ---: | --- | --- |
| 0–4 | Same image or a near-duplicate crop | Duplicate, not a pair |
| 5–8 | Same scene, same camera position, different stage | **HIGH** — publishable |
| 9–12 | Possibly the same room or elevation from a different angle | POSSIBLE — owner confirmation required |
| 13–22 | Same site at best, different viewpoint | NOT A PAIR |
| > 22 | Different scene | NOT A PAIR |

A genuine before/after pair is shot from a fixed position: the roofline, window
positions, wall openings and floor plane stay put while only the finish changes.
That produces a pHash distance in single figures. The **lowest non-duplicate
distance measured across the entire library is 10/63** — well outside that band.

### One duplicate found

`2026-10-16 at 10.27.15 AM` and `2026-10-16 at` score **Hamming 0/63** with a
colour-histogram correlation of 1.000. They are the same photograph sent twice —
confirmed by an identical SHA-256 digest — so this is a **duplicate, not a
before/after pair**. It is excluded from every count below, and only one copy is
published. That makes the library **71 files but 70 unique photographs**.

## Measured results

| Band | Pairs found |
| --- | ---: |
| Duplicate (≤ 4) — excluded | 1 |
| Same-scene (5–8) | 0 |
| POSSIBLE (9–12) | 1 |
| Weak / not a pair (13–22) | 50 |
| Total comparisons | 2485 |

## Candidate table

| Pair ID | Before image | After image | Matching evidence | Confidence | Approved for slider | Proposed route |
| --- | --- | --- | --- | --- | --- | --- |
| BA-01 | `2026-07-25 at 12.00.28 PM (10).jpeg` | `2026-07-25 at 12.00.28 PM (9).jpeg` | pHash Hamming 10/63 (84.1% structural match); colour-histogram correlation 0.773; adjacent in WhatsApp send order; identical aspect ratio; 1200×1600 vs 1200×1600 | POSSIBLE | **NO** | Held for owner review — not rendered publicly |
| BA-02 | `2026-10-16 at 10.27.15 AM (11).jpeg` | `2026-10-16 at 10.27.15 AM.jpeg` | pHash Hamming 16/63 (74.6% structural match); colour-histogram correlation 0.600; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-03 | `2026-10-16 at 10.27.15 AM (11).jpeg` | `2026-10-16 at.jpeg` | pHash Hamming 16/63 (74.6% structural match); colour-histogram correlation 0.600; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-04 | `2026-07-25 at 12.00.28 PM (1).jpeg` | `2026-10-16 at 10.27.15 AM (19).jpeg` | pHash Hamming 18/63 (71.4% structural match); colour-histogram correlation -0.090; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-05 | `2026-07-25 at 11.59.05 AM (1).jpeg` | `2026-07-25 at 11.59.05 AM (7).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.697; not adjacent in send order; different aspect ratio; 1024×683 vs 1328×747 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-06 | `2026-07-25 at 11.59.05 AM (12).jpeg` | `2026-07-25 at 12.00.28 PM (11).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.101; not adjacent in send order; different aspect ratio; 747×1328 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-07 | `2026-07-25 at 11.59.05 AM (13).jpeg` | `2026-07-25 at 12.00.28 PM (20).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.606; not adjacent in send order; different aspect ratio; 1200×1600 vs 1600×1200 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-08 | `2026-07-25 at 11.59.05 AM (15).jpeg` | `2026-10-16 at 10.27.16 AM.jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation -0.186; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-09 | `2026-07-25 at 11.59.05 AM (7).jpeg` | `2026-07-25 at 12.00.28 PM (17).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.130; not adjacent in send order; different aspect ratio; 1328×747 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-10 | `2026-07-25 at 11.59.05 AM (9).jpeg` | `2026-07-25 at 12.00.28 PM (23).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.698; not adjacent in send order; different aspect ratio; 1328×747 vs 1600×1200 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-11 | `2026-07-25 at 12.00.26 PM (1).jpeg` | `2026-10-16 at 10.27.15 AM (6).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.315; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |
| BA-12 | `2026-07-25 at 12.00.28 PM (1).jpeg` | `2026-07-25 at 12.00.28 PM (8).jpeg` | pHash Hamming 20/63 (68.3% structural match); colour-histogram correlation 0.396; not adjacent in send order; identical aspect ratio; 1200×1600 vs 1200×1600 | NOT A PAIR | **NO** | Held for owner review — not rendered publicly |

### Reading the candidate table

`BA-01` is the strongest relationship in the library: 2026-07-25 at 12.00.28 PM (10) and
2026-07-25 at 12.00.28 PM (9) are adjacent in send order, share an aspect ratio and
correlate at 0.773 on colour. That is consistent with one room
photographed from two angles — **not** with one viewpoint before and after
construction. It is recorded as POSSIBLE and is deliberately not published.

No image in the library is labelled "before" or "after" anywhere in the codebase.
An unfinished-looking frame beside a finished-looking frame is not evidence of a
transformation, and none has been presented as one.

## Verified project sequences

A multi-stage sequence (before → structural → installation → finishing → complete)
also cannot be established. Send-order adjacency inside the two WhatsApp batches
suggests a continuous photo walk, but structural hashing shows consecutive frames
are different viewpoints, so no stage order can be asserted as fact.

## What the site does instead

1. The strongest related images are shown **separately** with neutral captions
   ("Supplied project photography"), never as a before/after transformation.
2. `client/src/data/beforeAfter.ts` holds the 12 strongest candidates above,
   every one of them with `approved: false`.
3. `BeforeAfterComparison` refuses to render unless a pair is `approved: true`
   **and** both frames resolve to a published asset with a caption, so an
   unverified or half-filled pair cannot reach production by accident.
4. `client/src/data/beforeAfter.test.ts` fails the build if an approved pair
   points at a missing asset, repeats one frame, or leaves a caption empty.
5. Project pages present a **progress gallery** of neutrally-labelled supplied
   photography instead of a fabricated transformation narrative.

## Owner confirmation workflow

To publish a pair, the owner only needs to:

1. Identify two photographs of the **same property, same viewpoint**, one earlier
   and one later.
2. Set `approved: true` on the matching entry in `client/src/data/beforeAfter.ts`
   and fill in `projectType` and `caption`.
3. Re-run `npm test` — the before/after test fails the build if an approved pair
   points at a missing asset or leaves its caption empty.

No code change is required beyond that flag, and nothing renders until it is set.
