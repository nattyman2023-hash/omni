import { describe, expect, it } from 'vitest';
import {
  DEPTH_EASE,
  DEPTH_LIMITS,
  DEPTH_SETTLE,
  clampDepthPoint,
  depthIsSettled,
  depthLayerOffsets,
  depthStyleVars,
  easeDepth,
  normalizeDepthPointer,
} from './depthView';

const RECT = { left: 100, top: 50, width: 400, height: 300 };

describe('depth view geometry', () => {
  it('maps the centre of the frame to zero and the edges to plus or minus one', () => {
    expect(normalizeDepthPointer(300, 200, RECT)).toEqual({ x: 0, y: 0 });
    expect(normalizeDepthPointer(100, 50, RECT)).toEqual({ x: -1, y: -1 });
    expect(normalizeDepthPointer(500, 350, RECT)).toEqual({ x: 1, y: 1 });
    expect(normalizeDepthPointer(400, 200, RECT)).toEqual({ x: 0.5, y: 0 });
  });

  it('clamps pointers that leave the frame so a layer can never slide off its overscan', () => {
    expect(normalizeDepthPointer(-900, -900, RECT)).toEqual({ x: -1, y: -1 });
    expect(normalizeDepthPointer(9_000, 9_000, RECT)).toEqual({ x: 1, y: 1 });
  });

  it('returns the centre for a frame that has not been laid out yet', () => {
    // A hidden tab or a pre-layout measurement reports a zero rect; dividing by
    // it would write NaN into every transform.
    expect(normalizeDepthPointer(300, 200, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ x: 0, y: 0 });
    expect(normalizeDepthPointer(300, 200, { left: 0, top: 0, width: Number.NaN, height: 300 })).toEqual({ x: 0, y: 0 });
    expect(normalizeDepthPointer(Number.NaN, 200, RECT)).toEqual({ x: 0, y: 0 });
  });

  it('keeps every plane at rest when the pointer is centred', () => {
    expect(depthLayerOffsets({ x: 0, y: 0 })).toEqual({
      backdrop: { x: 0, y: 0 },
      photograph: { x: 0, y: 0 },
      glow: { x: 0, y: 0 },
    });
  });

  it('moves near planes against the pointer and the backdrop with it', () => {
    const offsets = depthLayerOffsets({ x: 1, y: 1 });
    // Nearer planes counter-move, the far plane drifts the same way as the hand.
    expect(offsets.photograph).toEqual({ x: -DEPTH_LIMITS.photograph, y: -DEPTH_LIMITS.photograph });
    expect(offsets.glow).toEqual({ x: -DEPTH_LIMITS.glow, y: -DEPTH_LIMITS.glow });
    expect(offsets.backdrop).toEqual({ x: DEPTH_LIMITS.backdrop, y: DEPTH_LIMITS.backdrop });
  });

  it('ranks the planes by distance so the parallax split is visible', () => {
    expect(DEPTH_LIMITS.glow).toBeGreaterThan(DEPTH_LIMITS.photograph);
    expect(DEPTH_LIMITS.photograph).toBeGreaterThan(DEPTH_LIMITS.backdrop);
    const offsets = depthLayerOffsets({ x: 1, y: 0 });
    expect(Math.abs(offsets.glow.x)).toBeGreaterThan(Math.abs(offsets.photograph.x));
    expect(Math.abs(offsets.photograph.x)).toBeGreaterThan(Math.abs(offsets.backdrop.x));
  });

  it('accepts narrower limits without changing the direction convention', () => {
    const offsets = depthLayerOffsets({ x: 0.5, y: -0.5 }, { backdrop: 4, photograph: 8, glow: 12 });
    expect(offsets).toEqual({
      backdrop: { x: 2, y: -2 },
      photograph: { x: -4, y: 4 },
      glow: { x: -6, y: 6 },
    });
  });

  it('writes every layer offset as a pixel custom property', () => {
    const vars = depthStyleVars({ x: 0.5, y: -1 });
    expect(vars).toEqual({
      '--depth-backdrop-x': '5px',
      '--depth-backdrop-y': '-10px',
      '--depth-photo-x': '-8px',
      '--depth-photo-y': '16px',
      '--depth-glow-x': '-13px',
      '--depth-glow-y': '26px',
    });
    for (const value of Object.values(vars)) {
      expect(value).toMatch(/^-?\d+(\.\d+)?px$/);
      expect(value).not.toContain('NaN');
    }
  });

  it('eases towards the target without overshooting it', () => {
    let point = { x: 0, y: 0 };
    const target = { x: 1, y: -0.5 };
    let previousDistance = Number.POSITIVE_INFINITY;
    for (let frame = 0; frame < 120; frame += 1) {
      point = easeDepth(point, target);
      const distance = Math.abs(target.x - point.x) + Math.abs(target.y - point.y);
      expect(distance).toBeLessThan(previousDistance);
      previousDistance = distance;
    }
    expect(point.x).toBeCloseTo(target.x, 2);
    expect(point.y).toBeCloseTo(target.y, 2);
    expect(point.x).toBeLessThanOrEqual(target.x);
    expect(point.y).toBeGreaterThanOrEqual(target.y);
  });

  it('snaps immediately when the factor is one, which is what reduced motion uses', () => {
    expect(easeDepth({ x: 0, y: 0 }, { x: 0.8, y: -0.4 }, 1)).toEqual({ x: 0.8, y: -0.4 });
    // Out-of-range factors fall back instead of freezing or exploding the loop.
    expect(easeDepth({ x: 0, y: 0 }, { x: 1, y: 1 }, 4)).toEqual({ x: 1, y: 1 });
    expect(easeDepth({ x: 0, y: 0 }, { x: 1, y: 1 }, Number.NaN)).toEqual({ x: DEPTH_EASE, y: DEPTH_EASE });
  });

  it('stops the animation loop once the frame is settled', () => {
    expect(depthIsSettled({ x: 1, y: 1 }, { x: 1.01, y: 0.95 })).toBe(true);
    expect(depthIsSettled({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
    expect(depthIsSettled({ x: 0, y: 0 }, { x: DEPTH_SETTLE + 0.01, y: 0 })).toBe(false);
  });

  it('clamps keyboard nudges to the frame so the view cannot drift away', () => {
    expect(clampDepthPoint({ x: 1.4, y: -1.4 })).toEqual({ x: 1, y: -1 });
    expect(clampDepthPoint({ x: 0.1 + 0.2, y: -0 })).toEqual({ x: 0.3, y: 0 });
    expect(clampDepthPoint({ x: Number.POSITIVE_INFINITY, y: 0 })).toEqual({ x: 0, y: 0 });
  });
});
