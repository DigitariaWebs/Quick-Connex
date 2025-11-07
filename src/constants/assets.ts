/**
 * Assets Constants
 * 
 * Centralized asset paths for images, icons, and other static resources.
 * Use these constants to maintain consistency and make asset management easier.
 */

export const ASSETS = {
  images: {
    logo: "/images/logo.png",
  },
} as const;

// Convenience exports for commonly used assets
export const LOGO_PATH = ASSETS.images.logo;

