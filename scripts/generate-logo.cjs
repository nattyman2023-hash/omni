// Turns the supplied white-on-black logo into transparent, recoloured variants.
// Usage: node scripts/generate-logo.cjs [source.png]
const path = require('node:path');
const sharp = require('sharp');

const source = process.argv[2] || path.join(__dirname, '..', 'docs', 'brand', 'omni-logo-source.png');
const outDir = path.join(__dirname, '..', 'public', 'images');
const variants = { white: [255, 255, 255], navy: [11, 28, 48] };

(async () => {
  const { data, info } = await sharp(source).greyscale().raw().toBuffer({ resolveWithObject: true });
  // Luminance becomes alpha; lift the near-black JPEG noise floor so the background is fully clear.
  const alpha = Buffer.alloc(info.width * info.height);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = Math.max(0, Math.min(255, Math.round((data[i * info.channels] - 24) * 255 / (235 - 24))));
  const bounds = await sharp(alpha, { raw: { width: info.width, height: info.height, channels: 1 } }).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const left = -(bounds.info.trimOffsetLeft || 0), top = -(bounds.info.trimOffsetTop || 0);
  const pad = 4;
  const width = bounds.info.width + pad * 2, height = bounds.info.height + pad * 2;
  for (const [name, [r, g, b]] of Object.entries(variants)) {
    const rgba = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const sx = x - pad + left, sy = y - pad + top;
      const a = sx >= 0 && sy >= 0 && sx < info.width && sy < info.height ? alpha[sy * info.width + sx] : 0;
      rgba.set([r, g, b, a], (y * width + x) * 4);
    }
    const image = sharp(rgba, { raw: { width, height, channels: 4 } });
    await image.clone().png({ compressionLevel: 9 }).toFile(path.join(outDir, `omni-logo-${name}.png`));
    await image.clone().webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(outDir, `omni-logo-${name}.webp`));
  }
  console.log(`Logo variants written (${width}x${height}).`);
})().catch(error => { console.error(error); process.exit(1); });
