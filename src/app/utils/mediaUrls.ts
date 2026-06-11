export function getImageThumbUrl(url: string): string {
  if (url.includes("-medium.webp")) return url.replace("-medium.webp", "-thumb.webp");
  return url;
}

export function getImageMediumUrl(url: string): string {
  if (url.includes("-full.webp")) return url.replace("-full.webp", "-medium.webp");
  if (url.includes("-thumb.webp")) return url.replace("-thumb.webp", "-medium.webp");
  return url;
}

export function getImageFullUrl(url: string): string {
  if (url.includes("-medium.webp")) return url.replace("-medium.webp", "-full.webp");
  return url;
}

export function getVideoPreviewUrl(url: string): string | null {
  if (!url) return null;
  const match = url.match(/^(.+)(\.[^.]+)$/);
  if (!match) return null;
  return `${match[1]}-preview.webm`;
}
