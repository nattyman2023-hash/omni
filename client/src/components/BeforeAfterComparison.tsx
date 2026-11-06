import { useId, useState } from 'react';
import { BeforeAfterPair, canRenderBeforeAfter } from '../data/beforeAfter';
import { PhotoAsset, photo, photoAspectRatio, photoWebpSrcSet } from '../data/photoAssets';
import SafeImage from './SafeImage';

type BeforeAfterComparisonProps = {
  pair: BeforeAfterPair;
  sizes?: string;
};

const DEFAULT_SIZES = '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 720px';

/**
 * Before/after wipe slider, gated behind explicit owner approval.
 *
 * `canRenderBeforeAfter` is the only thing that decides whether this renders.
 * docs/BEFORE_AFTER_EVIDENCE.md records **0 verified same-scene pairs** in the
 * supplied library, so every shipped pair is unapproved and this returns null.
 * The component exists so an owner-approved pair can be published later with no
 * code change, and so an unverified pair can never reach a customer by accident.
 */
export default function BeforeAfterComparison({ pair, sizes = DEFAULT_SIZES }: BeforeAfterComparisonProps) {
  const [reveal, setReveal] = useState(50);
  const sliderId = useId();

  // Hard gate. An unapproved pair — or an approved pair that points at a missing
  // asset, repeats one frame, or has no caption — renders nothing at all.
  if (!canRenderBeforeAfter(pair)) return null;

  const before = photo(pair.before.slug);
  const after = photo(pair.after.slug);
  // The container reserves the after frame's exact ratio, so neither image can
  // shift the layout while it decodes.
  const aspectRatio = photoAspectRatio(after);

  const frame = (asset: PhotoAsset, alt: string, component: string, clip?: string) => (
    <SafeImage
      sourceComponent={component}
      className="absolute inset-0 w-full h-full object-cover"
      style={clip ? { clipPath: clip } : undefined}
      alt={alt}
      src={asset.webp}
      srcSet={photoWebpSrcSet(asset)}
      sizes={sizes}
      width={asset.width}
      height={asset.height}
      loading="lazy"
      decoding="async"
    />
  );

  return (
    <figure className="w-full max-w-3xl mx-auto">
      <div
        className="relative w-full overflow-hidden rounded-xl bg-surface-dark shadow-2xl"
        style={{ aspectRatio }}
      >
        {frame(after, pair.after.caption, 'BeforeAfterComparison.After')}
        {/* clip-path keeps the before frame at full size instead of squashing it. */}
        {frame(before, pair.before.caption, 'BeforeAfterComparison.Before', `inset(0 ${100 - reveal}% 0 0)`)}

        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0 w-0.5 bg-surface-pure/90 shadow-lg"
          style={{ left: `${reveal}%` }}
        />

        <span className="absolute top-space-sm left-space-sm bg-surface-dark/85 backdrop-blur px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase tracking-wider text-on-primary">
          Before
        </span>
        <span className="absolute top-space-sm right-space-sm bg-surface-dark/85 backdrop-blur px-space-xs py-space-2xs rounded font-label-caps text-label-caps uppercase tracking-wider text-on-primary">
          After
        </span>
      </div>

      <label
        htmlFor={sliderId}
        className="block mt-space-md font-label-ui text-label-ui text-on-surface-variant"
      >
        Drag to compare the earlier and later photographs
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={100}
        step={1}
        value={reveal}
        onChange={(event) => setReveal(Number(event.target.value))}
        aria-valuetext={`${reveal}% of the earlier photograph shown`}
        className="w-full mt-space-2xs accent-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      />

      <figcaption className="mt-space-sm space-y-space-2xs">
        <p className="font-headline-sm text-headline-sm text-primary">{pair.projectType}</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Earlier: {pair.before.caption}. Later: {pair.after.caption}.
        </p>
      </figcaption>
    </figure>
  );
}
