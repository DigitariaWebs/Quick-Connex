/**
 * Design System - Theme Configuration
 * 
 * Centralized design tokens for consistent styling across the application.
 * Use these constants to maintain design consistency.
 */

export const BORDER_RADIUS = {
  none: "rounded-none",
  sm: "rounded-sm",
  base: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl", // Used for main content containers
  full: "rounded-full", // Used for pills, search bars, avatars
} as const;

export const SPACING = {
  section: "space-y-6",
  card: "p-6",
  cardSmall: "p-4",
  cardLarge: "p-8",
} as const;

export const SHADOWS = {
  sm: "shadow-sm",
  base: "shadow",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  none: "shadow-none",
} as const;

export const TRANSITIONS = {
  fast: "transition-all duration-150",
  normal: "transition-all duration-200",
  slow: "transition-all duration-300",
} as const;

export const BORDERS = {
  light: "border border-gray-100",
  base: "border border-gray-200",
  dark: "border border-gray-300",
} as const;

// Composite styles for common patterns
export const CARD_STYLES = {
  default: `bg-white ${BORDER_RADIUS["2xl"]} ${SHADOWS.sm} ${BORDERS.light}`,
  rounded: `bg-white ${BORDER_RADIUS["3xl"]} ${SHADOWS.sm} ${BORDERS.light}`,
  hover: `bg-white ${BORDER_RADIUS["2xl"]} ${SHADOWS.sm} ${BORDERS.light} hover:shadow-md ${TRANSITIONS.normal}`,
} as const;

export const INPUT_STYLES = {
  default: `px-4 py-2 bg-gray-50 border-0 ${BORDER_RADIUS.lg} text-sm focus:ring-2 focus:ring-gray-900 focus:bg-white ${TRANSITIONS.normal}`,
  pill: `px-4 py-2 bg-gray-100 border-0 ${BORDER_RADIUS.full} text-sm focus:ring-2 focus:ring-gray-300 focus:bg-white ${TRANSITIONS.normal}`,
} as const;

