import { ImgHTMLAttributes, useState } from 'react';

const FALLBACK_IMAGE =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 10"%3E%3Crect width="16" height="10" fill="%230f1b2d"/%3E%3Cpath d="M0 8 4.5 4l3 2.5L10 4l6 6H0Z" fill="%23526174"/%3E%3Ccircle cx="12" cy="3" r="1.2" fill="%23f4a51c"/%3E%3C/svg%3E';

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  sourceComponent?: string;
};

/**
 * Keeps image frames stable when content is missing or a file is unavailable.
 * The fallback is a local inline graphic, so a failed customer-facing image
 * never renders a large alt-text block across the design.
 */
export default function SafeImage({ sourceComponent, src, srcSet, loading, decoding, sizes, onError, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const optimizedSrc = typeof src === 'string' ? src.replace(/\.jpeg$/i, '.webp') : src;
  const responsiveBase = optimizedSrc?.match(/^(.*)\.webp$/i)?.[1];
  const generatedSrcSet = responsiveBase
    ? `${responsiveBase}-640.webp 640w, ${responsiveBase}-960.webp 960w, ${optimizedSrc} 1600w`
    : undefined;
  const heroImage = sourceComponent === 'App.PageHero' || sourceComponent?.endsWith('.Hero');

  return (
    <img
      {...props}
      src={failed ? FALLBACK_IMAGE : optimizedSrc || FALLBACK_IMAGE}
      srcSet={failed ? undefined : srcSet || generatedSrcSet}
      sizes={sizes || (generatedSrcSet ? '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 960px' : undefined)}
      loading={loading || (heroImage ? 'eager' : 'lazy')}
      decoding={decoding || 'async'}
      fetchPriority={heroImage ? 'high' : undefined}
      data-source-component={sourceComponent}
      onError={(event) => {
        if (!failed) {
          setFailed(true);
          if (import.meta.env.DEV) console.warn(`Image failed to load: ${optimizedSrc || '(missing source)'}`);
        }
        onError?.(event);
      }}
    />
  );
}
