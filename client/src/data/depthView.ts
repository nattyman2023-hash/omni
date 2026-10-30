/**
 * Geometry for the "step inside" depth frame on the homepage.
 *
 * One supplied photograph cannot produce a true 3D walkthrough: there is no
 * second viewpoint, no measured depth map and nothing outside the frame has
 * been photographed. What the photograph *can* do honestly is move as three
 * planes — a blurred copy behind, the real frame in the middle and a light
 * bloom in front — so the eye reads parallax instead of a flat still.
 *
 * Every number that decides how far a plane travels lives here, so the effect
 * stays unit-testable and `DepthHero` keeps only DOM wiring.
 */

export interface DepthRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A normalised pointer position: `-1` is one edge, `0` the centre, `1` the other. */
export interface DepthOffset {
  x: number;
  y: number;
}

export interface DepthLimits {
  /** Blurred copy behind the photograph. */
  backdrop: number;
  /** The supplied photograph itself. */
  photograph: number;
  /** Warm light bloom in front of the photograph. */
  glow: number;
}

export type DepthLayerName = keyof DepthLimits;
export type DepthLayerOffsets = Record<DepthLayerName, DepthOffset>;

/**
 * Furthest each plane travels, in CSS pixels, at full pointer deflection.
 *
 * The split is deliberately exaggerated — near planes travel further and
 * opposite the pointer, the far plane drifts with it — because a physically
 * accurate split on a single frame is too small to read at this size.
 */
export const DEPTH_LIMITS: DepthLimits = {
  backdrop: 10,
  photograph: 16,
  glow: 26,
};

/** Fraction of the remaining distance covered per frame (~220 ms to settle). */
export const DEPTH_EASE = 0.12;

/** Sub-pixel distance at which the frame counts as settled and the loop stops. */
export const DEPTH_SETTLE = 0.15;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(-1, value));
}

function round2(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  // `-0` prints as "0" but is not `Object.is`-equal to it, which would make
  // offset comparisons depend on the sign of a zero.
  return rounded === 0 ? 0 : rounded;
}

/** Keeps a point inside the normalised range, for keyboard nudges. */
export function clampDepthPoint(point: DepthOffset): DepthOffset {
  return { x: round2(clampUnit(point.x)), y: round2(clampUnit(point.y)) };
}

/**
 * Converts viewport coordinates into a normalised point inside the frame.
 * A frame that has not been laid out yet (zero width or height) resolves to the
 * centre rather than dividing by zero and painting `NaN` transforms.
 */
export function normalizeDepthPointer(clientX: number, clientY: number, rect: DepthRect): DepthOffset {
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = ((clientY - rect.top) / rect.height) * 2 - 1;
  return clampDepthPoint({ x, y });
}

/**
 * Pixel offset for each plane. The photograph and the bloom move against the
 * pointer (they are nearer the viewer), the blurred backdrop moves with it.
 */
export function depthLayerOffsets(point: DepthOffset, limits: DepthLimits = DEPTH_LIMITS): DepthLayerOffsets {
  const x = clampUnit(point.x);
  const y = clampUnit(point.y);
  return {
    backdrop: { x: round2(x * limits.backdrop), y: round2(y * limits.backdrop) },
    photograph: { x: round2(x * -limits.photograph), y: round2(y * -limits.photograph) },
    glow: { x: round2(x * -limits.glow), y: round2(y * -limits.glow) },
  };
}

/**
 * The CSS custom properties `DepthHero` writes onto the scene. Emitting a plain
 * record keeps `styles.css` free of layer maths and makes the values assertable.
 */
export function depthStyleVars(point: DepthOffset, limits: DepthLimits = DEPTH_LIMITS): Record<string, string> {
  const offsets = depthLayerOffsets(point, limits);
  return {
    '--depth-backdrop-x': `${offsets.backdrop.x}px`,
    '--depth-backdrop-y': `${offsets.backdrop.y}px`,
    '--depth-photo-x': `${offsets.photograph.x}px`,
    '--depth-photo-y': `${offsets.photograph.y}px`,
    '--depth-glow-x': `${offsets.glow.x}px`,
    '--depth-glow-y': `${offsets.glow.y}px`,
  };
}

/** Eases `current` towards `target` without ever overshooting it. */
export function easeDepth(current: DepthOffset, target: DepthOffset, factor: number = DEPTH_EASE): DepthOffset {
  const step = Math.min(1, Math.max(0, Number.isFinite(factor) ? factor : DEPTH_EASE));
  return {
    x: current.x + (target.x - current.x) * step,
    y: current.y + (target.y - current.y) * step,
  };
}

/** True once easing is close enough that another frame would be invisible. */
export function depthIsSettled(current: DepthOffset, target: DepthOffset, tolerance: number = DEPTH_SETTLE): boolean {
  return Math.abs(target.x - current.x) <= tolerance && Math.abs(target.y - current.y) <= tolerance;
}
