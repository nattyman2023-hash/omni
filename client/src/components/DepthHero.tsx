import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import {
  DEPTH_EASE,
  type DepthOffset,
  clampDepthPoint,
  depthIsSettled,
  depthStyleVars,
  easeDepth,
  normalizeDepthPointer,
} from '../data/depthView';
import { photo, photoWebpSrcSet } from '../data/photoAssets';
import SafeImage from './SafeImage';
import { MSIcon } from './icons';

type DepthHeroProps = {
  /** Slug from `client/src/data/photoAssets.ts`. */
  slug: string;
  /** Literal description of the supplied photograph. */
  alt: string;
  /** Small amber label above the caption title. */
  label?: string;
  /** Caption headline that stays neutral about unverified project facts. */
  title?: string;
  /** Secondary meta line, e.g. "Featured project image". */
  meta?: string;
  sizes?: string;
};

type DepthStyle = CSSProperties & Record<`--${string}`, string | number>;

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px';

/** Keyboard nudge per arrow press, in normalised frame units. */
const KEYBOARD_NUDGE: Record<string, DepthOffset> = {
  ArrowLeft: { x: -0.25, y: 0 },
  ArrowRight: { x: 0.25, y: 0 },
  ArrowUp: { x: 0, y: -0.25 },
  ArrowDown: { x: 0, y: 0.25 },
};

/**
 * Homepage "step inside" frame.
 *
 * The supplied photograph is the real frame: a blurred copy of the *same* file
 * sits behind it and a warm bloom in front, and the three planes counter-move
 * against the pointer. Nothing is invented, redrawn or filled in — the effect
 * only moves what the photographer actually captured, which is why the caption
 * calls it a visual presentation of a supplied photograph rather than a 3D
 * walkthrough.
 *
 * Motion rules, in order of priority:
 *  - `prefers-reduced-motion: reduce` removes the drift, the easing and the
 *    pointer parallax (the step-in toggle still works, instantly).
 *  - The drift is decorative and can be paused (WCAG 2.2.2), so the frame
 *    carries a visible pause control.
 *  - Pointer parallax is ignored for touch pointers, where a drag would fight
 *    page scrolling.
 */
export default function DepthHero({
  slug,
  alt,
  label = 'Supplied project photography',
  title,
  meta = 'Featured project image',
  sizes = DEFAULT_SIZES,
}: DepthHeroProps) {
  const asset = photo(slug);
  const hintId = useId();
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<DepthOffset>({ x: 0, y: 0 });
  const currentRef = useRef<DepthOffset>({ x: 0, y: 0 });
  const frameRef = useRef<number | null>(null);
  const reducedRef = useRef(false);

  const [steppedIn, setSteppedIn] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  /** Writes the current plane offsets as CSS custom properties. */
  const paint = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    for (const [name, value] of Object.entries(depthStyleVars(currentRef.current))) {
      scene.style.setProperty(name, value);
    }
  }, []);

  /** One animation frame of easing; stops itself as soon as the frame settles. */
  const runFrame = useCallback(() => {
    frameRef.current = null;
    if (depthIsSettled(currentRef.current, targetRef.current)) {
      currentRef.current = { ...targetRef.current };
      paint();
      return;
    }
    currentRef.current = easeDepth(currentRef.current, targetRef.current, reducedRef.current ? 1 : DEPTH_EASE);
    paint();
    frameRef.current = window.requestAnimationFrame(runFrame);
  }, [paint]);

  const requestFrame = useCallback(() => {
    if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(runFrame);
  }, [runFrame]);

  // Stop any pending frame when the page navigates away mid-animation.
  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    },
    [],
  );

  // Track the motion preference live, so toggling it in the OS applies at once.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedRef.current = query.matches;
      setReducedMotion(query.matches);
    };
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    // Touch drags belong to the page scroll, not to the depth planes.
    if (reducedRef.current || event.pointerType === 'touch') return;
    targetRef.current = normalizeDepthPointer(
      event.clientX,
      event.clientY,
      event.currentTarget.getBoundingClientRect(),
    );
    requestFrame();
  };

  const resetPointer = () => {
    targetRef.current = { x: 0, y: 0 };
    requestFrame();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && steppedIn) {
      setSteppedIn(false);
      return;
    }
    const nudge = KEYBOARD_NUDGE[event.key];
    if (!nudge) return;
    event.preventDefault();
    targetRef.current = clampDepthPoint({
      x: targetRef.current.x + nudge.x,
      y: targetRef.current.y + nudge.y,
    });
    requestFrame();
  };

  const frameStyle: DepthStyle = { '--depth-zoom': steppedIn ? 1.18 : 1 };

  return (
    <figure className="depth-hero">
      <div
        className="depth-hero-frame"
        data-stepped={steppedIn ? 'true' : 'false'}
        style={frameStyle}
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
        onBlur={resetPointer}
        onKeyDown={handleKeyDown}
      >
        <div
          className="depth-hero-scene"
          ref={sceneRef}
          data-motion={reducedMotion ? 'reduced' : paused ? 'paused' : 'running'}
        >
          {/* Furthest plane: the same supplied file, blurred and pushed back so
              the photograph reads as a window rather than a pasted rectangle. */}
          <div className="depth-hero-backdrop" aria-hidden="true">
            <SafeImage
              sourceComponent="DepthHero.Backdrop"
              src={asset.webp}
              srcSet={photoWebpSrcSet(asset)}
              sizes={sizes}
              alt=""
              width={asset.width}
              height={asset.height}
              loading="eager"
              decoding="async"
            />
          </div>

          <div className="depth-hero-zoom">
            <div className="depth-hero-drift">
              <div className="depth-hero-parallax">
                <SafeImage
                  sourceComponent="DepthHero.Hero"
                  className="depth-hero-photo"
                  src={asset.webp}
                  srcSet={photoWebpSrcSet(asset)}
                  sizes={sizes}
                  alt={alt}
                  width={asset.width}
                  height={asset.height}
                  decoding="async"
                />
              </div>
            </div>
          </div>

          {/* Nearest plane: a warm bloom, not a rendered interior. */}
          <div className="depth-hero-glow" aria-hidden="true" />
          <div className="depth-hero-vignette" aria-hidden="true" />
        </div>

        <span className="depth-hero-tag">
          <span className="depth-hero-tag-dot" aria-hidden="true" />
          Interactive depth preview
        </span>

        <button
          type="button"
          className="depth-hero-hit"
          aria-pressed={steppedIn}
          aria-describedby={hintId}
          onClick={() => setSteppedIn((value) => !value)}
        >
          <span className="depth-hero-hit-pill">
            <MSIcon name={steppedIn ? 'arrow_back' : 'arrow_forward'} size={16} />
            <span>{steppedIn ? 'Step back to the full view' : 'Step inside the project'}</span>
          </span>
        </button>

        {!reducedMotion && (
          <button
            type="button"
            className="depth-hero-motion"
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? 'Resume motion' : 'Pause motion'}
          </button>
        )}
      </div>

      <figcaption className="depth-hero-caption">
        <span className="depth-hero-caption-label">{label}</span>
        {title && <p className="depth-hero-caption-title">{title}</p>}
        <div className="depth-hero-caption-meta">
          <span>{meta}</span>
          <strong>Details available on request</strong>
        </div>
        <p className="depth-hero-caption-note" id={hintId}>
          Move the pointer over the photograph — or use the arrow keys — to shift the view. A depth effect on a
          supplied photograph: a visual presentation, not a 3D walkthrough.
        </p>
      </figcaption>
    </figure>
  );
}
