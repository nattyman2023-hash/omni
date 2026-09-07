import { useEffect, useState } from 'react';
import { ProjectGalleryImage } from '../data/projectFeed';
import SafeImage from './SafeImage';

type ProjectGalleryProps = {
  projectTitle: string;
  images: ProjectGalleryImage[];
};

/** Shared Stitch-matched gallery viewer for every published project. */
export default function ProjectGallery({ projectTitle, images }: ProjectGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(images.length - 1, 0)));
  }, [images]);

  if (images.length === 0) return null;

  const activeImage = images[activeIndex] || images[0];

  return (
    <section className="w-full bg-surface-container py-space-3xl" id="gallery" aria-labelledby="project-gallery-heading">
      <div className="max-w-container-max mx-auto px-gutter-mobile lg:px-gutter-desktop">
        <div className="text-center max-w-2xl mx-auto mb-space-xl space-y-space-xs">
          <span className="font-label-caps text-label-caps text-secondary uppercase tracking-widest">Supplied Photography</span>
          <h2 id="project-gallery-heading" className="font-headline-xl text-headline-xl-mobile lg:text-headline-xl text-primary tracking-tight">Project Gallery</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            A visual record from our own project photography. Select a thumbnail to view it larger.
          </p>
        </div>

        <div className="relative w-full max-w-5xl mx-auto rounded-xl overflow-hidden shadow-2xl bg-surface-dark aspect-[16/9] md:aspect-[21/9]">
          <SafeImage
            sourceComponent="ProjectGallery.Viewer"
            className="w-full h-full object-cover"
            alt={activeImage.alt}
            src={activeImage.src}
            width={1200}
            height={800}
            loading="eager"
            sizes="(max-width: 768px) calc(100vw - 32px), min(1024px, 100vw - 64px)"
          />
          <div className="absolute bottom-space-md left-space-md bg-surface-dark/85 backdrop-blur px-space-sm py-space-2xs rounded font-label-caps text-label-caps uppercase tracking-wider text-on-primary">
            Supplied Project Photography &bull; {activeIndex + 1} of {images.length}
          </div>
        </div>

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-space-sm max-w-5xl mx-auto mt-space-md flex-wrap" aria-label={`${projectTitle} gallery images`}>
            {images.map((image, index) => (
              <button
                key={`${image.src}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${image.alt}`}
                aria-current={index === activeIndex ? 'true' : undefined}
                className={`relative w-20 h-16 md:w-24 md:h-20 rounded-lg overflow-hidden shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
                  index === activeIndex ? 'ring-2 ring-amber-highlight' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <SafeImage
                  sourceComponent="ProjectGallery.Thumbnail"
                  className="w-full h-full object-cover"
                  alt=""
                  aria-hidden="true"
                  src={image.src}
                  width={240}
                  height={160}
                  loading="eager"
                  sizes="96px"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
