import sharp from "sharp";

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  quality: number;
}

export interface ImageSizes {
  full: ProcessedImage;
  medium: ProcessedImage;
  thumb: ProcessedImage;
}

export async function processImage(inputBuffer: Buffer): Promise<ImageSizes> {
  const metadata = await sharp(inputBuffer).metadata();
  const inputWidth = metadata.width ?? 0;

  const full = await sharp(inputBuffer)
    .resize({ width: Math.min(1200, inputWidth), withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const medium = await sharp(inputBuffer)
    .resize({ width: Math.min(800, inputWidth), withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const thumb = await sharp(inputBuffer)
    .resize({ width: Math.min(400, inputWidth), withoutEnlargement: true })
    .webp({ quality: 75 })
    .toBuffer();

  return {
    full: { buffer: full, width: Math.min(1200, inputWidth), quality: 82 },
    medium: { buffer: medium, width: Math.min(800, inputWidth), quality: 80 },
    thumb: { buffer: thumb, width: Math.min(400, inputWidth), quality: 75 },
  };
}
