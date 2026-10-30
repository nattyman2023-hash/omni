import { describe, expect, it } from 'vitest';
import {
  LANDSCAPE_PHOTO_ASSETS,
  PHOTO_ASSETS,
  PORTRAIT_PHOTO_ASSETS,
  photo,
  photoAspectRatio,
  photoJpegSrcSet,
  photoVariantPath,
  photoWebpSrcSet,
} from './photoAssets';

const portrait = PHOTO_ASSETS.find((asset) => asset.orientation === 'portrait')!;
const landscape = PHOTO_ASSETS.find((asset) => asset.orientation === 'landscape')!;

describe('photo asset index', () => {
  it('measures every published frame so no image can shift the layout', () => {
    expect(PHOTO_ASSETS.length).toBeGreaterThan(0);
    for (const asset of PHOTO_ASSETS) {
      expect(asset.width, asset.slug).toBeGreaterThan(0);
      expect(asset.height, asset.slug).toBeGreaterThan(0);
      expect(['portrait', 'landscape'], asset.slug).toContain(asset.orientation);
    }
  });

  it('derives orientation from the measured dimensions, not from the slug', () => {
    for (const asset of PHOTO_ASSETS) {
      const expected = asset.width >= asset.height ? 'landscape' : 'portrait';
      expect(asset.orientation, asset.slug).toBe(expected);
    }
  });

  it('points every frame at a served /images path', () => {
    for (const asset of PHOTO_ASSETS) {
      expect(asset.webp, asset.slug).toMatch(/^\/images\/[a-z0-9-]+\.webp$/);
      expect(asset.jpeg, asset.slug).toMatch(/^\/images\/[a-z0-9-]+\.jpeg$/);
    }
  });

  it('keeps only variants that are narrower than the full frame', () => {
    for (const asset of PHOTO_ASSETS) {
      expect(asset.variants.length, asset.slug).toBeGreaterThan(0);
      for (const width of asset.variants) {
        expect(width, asset.slug).toBeLessThan(asset.width);
      }
    }
  });

  it('splits the library into portrait and landscape pools that add up', () => {
    expect(PORTRAIT_PHOTO_ASSETS.length + LANDSCAPE_PHOTO_ASSETS.length).toBe(PHOTO_ASSETS.length);
    // The supplied batch is overwhelmingly portrait, which is why the UI plan
    // favours portrait-friendly cards and rails over wide heroes.
    expect(PORTRAIT_PHOTO_ASSETS.length).toBeGreaterThan(LANDSCAPE_PHOTO_ASSETS.length);
  });

  it('looks assets up by slug and fails loudly on an unknown one', () => {
    expect(photo(portrait.slug)).toBe(portrait);
    expect(() => photo('not-a-real-photo')).toThrow(/Unknown photo asset slug/);
  });

  it('builds variant paths that match the generator filename convention', () => {
    expect(photoVariantPath(portrait, 640)).toBe(`/images/${portrait.slug}-640.webp`);
    expect(photoVariantPath(portrait, 960)).toBe(`/images/${portrait.slug}-960.webp`);
  });

  it('exposes an aspect ratio string that reserves exact space', () => {
    expect(photoAspectRatio(portrait)).toBe(`${portrait.width} / ${portrait.height}`);
    expect(photoAspectRatio(landscape)).toBe(`${landscape.width} / ${landscape.height}`);
  });

  it('advertises only widths the browser will really receive', () => {
    // The JPEG fallback has no responsive variants, so it must claim exactly one
    // width. Claiming 1600w for a 1200px file would make the browser download
    // the wrong frame.
    expect(photoJpegSrcSet(portrait)).toBe(`${portrait.jpeg} ${portrait.width}w`);
  });

  it('orders the WebP srcSet from narrowest to the full-size frame', () => {
    const srcSet = photoWebpSrcSet(portrait);
    const rungs = srcSet.split(', ');
    const widths = rungs.map((rung) => Number(rung.match(/(\d+)w$/)![1]));

    expect(widths).toEqual([...widths].sort((a, b) => a - b));
    // The last rung must be the real full-size file, so the browser never has to
    // guess a width that was not generated.
    expect(widths[widths.length - 1]).toBe(portrait.width);
    expect(rungs[rungs.length - 1]).toBe(`${portrait.webp} ${portrait.width}w`);
    // Every rung must resolve to a file the generator actually wrote.
    expect(rungs[0]).toBe(`${photoVariantPath(portrait, portrait.variants[portrait.variants.length - 1])} ${portrait.variants[portrait.variants.length - 1]}w`);
    expect(srcSet).not.toContain('1600w');
  });
});
