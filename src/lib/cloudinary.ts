/**
 * Cloudinary URL optimization helper
 * Adds auto format, quality, and optional transformations
 */

export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  } = {}
): string {
  if (!url) return '';
  
  // Only transform Cloudinary URLs
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  const { width, height, quality = 'auto', format = 'auto' } = options;

  // Build transformation string
  const transforms: string[] = [];
  
  // Auto format and quality
  transforms.push(`f_${format}`);
  transforms.push(`q_${quality}`);
  
  // Optional dimensions
  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push('c_limit'); // Maintain aspect ratio
  
  const transformStr = transforms.join(',');

  // Insert transforms into URL
  // Cloudinary URL format: https://res.cloudinary.com/CLOUD_NAME/image/upload/TRANSFORMS/PATH
  return url.replace('/upload/', `/upload/${transformStr}/`);
}

/**
 * Get optimized thumbnail URL
 */
export function getThumbnailUrl(url: string | null | undefined, size: number = 400): string {
  return optimizeCloudinaryUrl(url, { width: size, height: size, quality: 'auto:eco' });
}

/**
 * Get optimized card image URL
 */
export function getCardImageUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, { width: 600, quality: 'auto:good' });
}

/**
 * Get optimized full-size image URL
 */
export function getFullImageUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, { width: 1200, quality: 'auto:good' });
}

/**
 * Get optimized hero image URL
 */
export function getHeroImageUrl(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, { width: 1600, quality: 'auto:best' });
}
