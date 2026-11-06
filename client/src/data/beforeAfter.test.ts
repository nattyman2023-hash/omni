import { describe, expect, it } from 'vitest';
import { PHOTO_ASSETS } from './photoAssets';
import {
  BEFORE_AFTER_PAIRS,
  BeforeAfterPair,
  beforeAfterPairProblems,
  canRenderBeforeAfter,
  publishableBeforeAfterPairs,
} from './beforeAfter';

function completePair(overrides: Partial<BeforeAfterPair> = {}): BeforeAfterPair {
  return {
    id: 'BA-TEST',
    before: { slug: PHOTO_ASSETS[0].slug, caption: 'Earlier photograph' },
    after: { slug: PHOTO_ASSETS[1].slug, caption: 'Later photograph' },
    projectType: 'Home Extension',
    evidence: 'Owner-confirmed same viewpoint',
    confidence: 'HIGH',
    approved: true,
    ...overrides,
  };
}

describe('before/after approval gate', () => {
  it('ships no approved pair, because the library has 0 verified same-scene pairs', () => {
    expect(BEFORE_AFTER_PAIRS.length).toBeGreaterThan(0);
    expect(BEFORE_AFTER_PAIRS.filter((pair) => pair.approved)).toEqual([]);
    expect(publishableBeforeAfterPairs()).toEqual([]);
    expect(BEFORE_AFTER_PAIRS.every((pair) => !canRenderBeforeAfter(pair))).toBe(true);
  });

  it('only ever points at photographs that are really published', () => {
    const slugs = new Set(PHOTO_ASSETS.map((asset) => asset.slug));
    const unknown = BEFORE_AFTER_PAIRS.flatMap((pair) => [pair.before.slug, pair.after.slug])
      .filter((slug) => !slugs.has(slug));
    expect(unknown).toEqual([]);
  });

  it('documents any pair whose two frames collapse onto one asset', () => {
    // BA-03's "after" frame is the byte-identical re-send of BA-02's, so it is
    // not a separate candidate. That must be stated, not hidden.
    for (const pair of BEFORE_AFTER_PAIRS) {
      if (pair.before.slug === pair.after.slug) {
        expect(pair.note, `${pair.id} needs a note explaining the collapse`).toBeTruthy();
        expect(pair.approved).toBe(false);
      }
    }
  });

  it('refuses an approved pair that points at a missing asset', () => {
    const pair = completePair({ before: { slug: 'not-a-real-asset', caption: 'Earlier photograph' } });
    expect(canRenderBeforeAfter(pair)).toBe(false);
    expect(beforeAfterPairProblems(pair).join(' ')).toContain('missing asset');
  });

  it('refuses an approved pair with an empty caption', () => {
    const pair = completePair({ after: { slug: PHOTO_ASSETS[1].slug, caption: '   ' } });
    expect(canRenderBeforeAfter(pair)).toBe(false);
    expect(beforeAfterPairProblems(pair).join(' ')).toContain('empty caption');
  });

  it('refuses an approved pair with no confirmed project label', () => {
    const pair = completePair({ projectType: '' });
    expect(canRenderBeforeAfter(pair)).toBe(false);
    expect(beforeAfterPairProblems(pair).join(' ')).toContain('projectType is empty');
  });

  it('refuses an approved pair that shows the same photograph twice', () => {
    const pair = completePair({ after: { slug: PHOTO_ASSETS[0].slug, caption: 'Later photograph' } });
    expect(canRenderBeforeAfter(pair)).toBe(false);
    expect(beforeAfterPairProblems(pair).join(' ')).toContain('same asset');
  });

  it('still refuses a complete pair the owner has not approved', () => {
    expect(canRenderBeforeAfter(completePair({ approved: false }))).toBe(false);
  });

  it('allows a complete, owner-approved pair through', () => {
    const pair = completePair();
    expect(beforeAfterPairProblems(pair)).toEqual([]);
    expect(canRenderBeforeAfter(pair)).toBe(true);
    expect(publishableBeforeAfterPairs([pair])).toEqual([pair]);
  });
});
