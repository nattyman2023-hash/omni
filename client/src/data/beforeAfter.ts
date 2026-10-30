import { PHOTO_ASSET_BY_SLUG } from './photoAssets';

export type BeforeAfterConfidence = 'HIGH' | 'POSSIBLE' | 'NOT A PAIR';

export interface BeforeAfterFrame {
  /** Slug from `client/src/data/photoAssets.ts`. */
  slug: string;
  /**
   * Neutral caption. Unconfirmed frames are described as supplied photography
   * and are never labelled as a trade the owner has not confirmed.
   */
  caption: string;
}

export interface BeforeAfterPair {
  /** Matches the `BA-nn` id in docs/BEFORE_AFTER_EVIDENCE.md. */
  id: string;
  before: BeforeAfterFrame;
  after: BeforeAfterFrame;
  /** Owner-confirmed trade or project label. Empty until the owner confirms. */
  projectType: string;
  /** Measured evidence copied from the candidate table in the evidence report. */
  evidence: string;
  confidence: BeforeAfterConfidence;
  /**
   * The single gate that allows public rendering. Setting this to `true` is the
   * owner's sign-off that both frames are the same property, shot from the same
   * viewpoint, one earlier and one later. Nothing renders until it is set.
   */
  approved: boolean;
  /** Why this candidate is weaker than it looks, where that applies. */
  note?: string;
}

/**
 * Every candidate produced by the measured pair analysis, ranked exactly as in
 * docs/BEFORE_AFTER_EVIDENCE.md. The library contains **0 verified same-scene
 * pairs**, so every entry ships unapproved and `BeforeAfterComparison` renders
 * nothing. Flip `approved` only with owner sign-off.
 */
export const BEFORE_AFTER_PAIRS: BeforeAfterPair[] = [
  {
    id: 'BA-01',
    before: { slug: 'omni-a120028-10', caption: 'Supplied project photography' },
    after: { slug: 'omni-a120028-09', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 10/63 (84.1% structural match); colour correlation 0.773; adjacent in send order; identical aspect ratio',
    confidence: 'POSSIBLE',
    approved: false,
    note: 'Strongest relationship in the library, but consistent with one room photographed from two angles rather than one viewpoint before and after construction.',
  },
  {
    id: 'BA-02',
    before: { slug: 'omni-b102715-11', caption: 'Supplied project photography' },
    after: { slug: 'omni-b102715-00', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 16/63 (74.6% structural match); colour correlation 0.600; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-03',
    before: { slug: 'omni-b102715-11', caption: 'Supplied project photography' },
    after: { slug: 'omni-b102715-00', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 16/63 (74.6% structural match); colour correlation 0.600; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
    note: 'Not a separate candidate: its "after" frame is the byte-identical re-send of BA-02\'s, so it resolves to the same published asset.',
  },
  {
    id: 'BA-04',
    before: { slug: 'omni-a120028-01', caption: 'Supplied project photography' },
    after: { slug: 'omni-b102715-19', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 18/63 (71.4% structural match); colour correlation -0.090; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-05',
    before: { slug: 'garden-landscaping', caption: 'Supplied project photography' },
    after: { slug: 'omni-a115905-07', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.697; not adjacent in send order; different aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-06',
    before: { slug: 'omni-a115905-12', caption: 'Supplied project photography' },
    after: { slug: 'omni-a120028-11', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.101; not adjacent in send order; different aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-07',
    before: { slug: 'omni-a115905-13', caption: 'Supplied project photography' },
    after: { slug: 'insulation-room', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.606; not adjacent in send order; different aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-08',
    before: { slug: 'home-extension-hero', caption: 'Supplied project photography' },
    after: { slug: 'omni-b102716-00', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation -0.186; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-09',
    before: { slug: 'omni-a115905-07', caption: 'Supplied project photography' },
    after: { slug: 'omni-a120028-17', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.130; not adjacent in send order; different aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-10',
    before: { slug: 'driveway-finish', caption: 'Supplied project photography' },
    after: { slug: 'omni-a120028-23', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.698; not adjacent in send order; different aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-11',
    before: { slug: 'omni-a120026-01', caption: 'Supplied project photography' },
    after: { slug: 'omni-b102715-06', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.315; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
  {
    id: 'BA-12',
    before: { slug: 'omni-a120028-01', caption: 'Supplied project photography' },
    after: { slug: 'omni-a120028-08', caption: 'Supplied project photography' },
    projectType: '',
    evidence: 'pHash Hamming 20/63 (68.3% structural match); colour correlation 0.396; not adjacent in send order; identical aspect ratio',
    confidence: 'NOT A PAIR',
    approved: false,
  },
];

/**
 * Everything that would make an approved pair unsafe to publish. Returning
 * strings rather than a boolean keeps the failure reason visible in tests and
 * in the owner-approval workflow.
 */
export function beforeAfterPairProblems(pair: BeforeAfterPair): string[] {
  const problems: string[] = [];
  const frames: Array<[string, BeforeAfterFrame]> = [['before', pair.before], ['after', pair.after]];
  for (const [role, frame] of frames) {
    if (!PHOTO_ASSET_BY_SLUG[frame.slug]) {
      problems.push(`${pair.id}: ${role} frame points at missing asset "${frame.slug}"`);
    }
    if (!frame.caption.trim()) {
      problems.push(`${pair.id}: ${role} frame has an empty caption`);
    }
  }
  if (pair.before.slug === pair.after.slug) {
    problems.push(`${pair.id}: before and after resolve to the same asset, so this is a duplicate, not a transformation`);
  }
  if (!pair.projectType.trim()) {
    problems.push(`${pair.id}: projectType is empty, so the pair cannot be labelled honestly`);
  }
  return problems;
}

/**
 * The gate `BeforeAfterComparison` obeys. A pair renders only when the owner has
 * approved it AND it is complete, so an approval typo cannot publish a pair that
 * points at a missing asset or carries no caption.
 */
export function canRenderBeforeAfter(pair: BeforeAfterPair): boolean {
  return pair.approved && beforeAfterPairProblems(pair).length === 0;
}

/** Approved and complete pairs only — the sole set the public site may show. */
export function publishableBeforeAfterPairs(pairs: BeforeAfterPair[] = BEFORE_AFTER_PAIRS): BeforeAfterPair[] {
  return pairs.filter(canRenderBeforeAfter);
}
