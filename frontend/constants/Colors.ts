/**
 * App colors imported from theme.ts file.
 * Single theme configuration - no dark mode support.
 */

import { COLORS } from './theme';

export const Colors = {
  /** The main interactive color for buttons, progress bars, and selected states. */
  primary: COLORS.primary,
  /** A lighter shade of the primary color, perfect for disabled buttons or secondary highlights. */
  primaryLight: COLORS.primaryLight,

  // --- Background and Surface Colors ---
  /** The main background color for screens. A soft, gentle off-white. */
  background: COLORS.background,
  /** The background color for components that sit on top of the main background, like cards and inputs. */
  surface: COLORS.surface,

  // --- Text Colors ---
  /** The primary, high-contrast text color for main content and questions. */
  text: COLORS.textPrimary,
  textPrimary: COLORS.textPrimary,
  /** A muted, secondary text color for less important information like subtitles or progress indicators. */
  textSecondary: COLORS.textSecondary,
  /** The color for text that appears on top of a 'primary' colored background. */
  textOnPrimary: COLORS.textOnPrimary,

  // --- Icon and Tab Colors ---
  /** Tab icons and general icons */
  icon: COLORS.textSecondary,
  tabIconDefault: COLORS.textSecondary,
  tabIconSelected: COLORS.primary,

  /** Tint color for navigation and interactive elements */
  tint: COLORS.primary,

  // --- Border and Utility Colors ---
  /** The color for borders on components like unselected option buttons. */
  border: COLORS.border,
  /** A standard, high-visibility color for error messages or alerts. */
  error: COLORS.error,
};
