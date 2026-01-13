export const COLORS = {
  /** The main interactive color for buttons, progress bars, and selected states. */
  primary: '#88AB8E',
  /** A lighter shade of the primary color, perfect for disabled buttons or secondary highlights. */
  primaryLight: '#AFC8AD',
  success: '#4CAF50',

  // --- Background and Surface Colors ---
  /** The main background color for screens. A soft, gentle off-white. */
  background: '#F2F1EB',
  /** The background color for components that sit on top of the main background, like cards and inputs. */
  surface: '#FFFFFF',

  // --- Text Colors ---
  /** The primary, high-contrast text color for main content and questions. */
  textPrimary: '#333333',
  /** A muted, secondary text color for less important information like subtitles or progress indicators. */
  textSecondary: '#A9A9A9',
  /** The color for text that appears on top of a 'primary' colored background. */
  textOnPrimary: '#FFFFFF',

  // --- Border and Utility Colors ---
  /** The color for borders on components like unselected option buttons. */
  border: '#EEE7DA',
  /** A standard, high-visibility color for error messages or alerts. */
  error: '#B00020',
};

export const FONT_SIZES = {
  body: 18,
  heading: 26,
  subheading: 16,
  button: 18,
  completionHeading: 32,
  completionSubheading: 18,
};

export const FONT_WEIGHTS = {
  regular: "400",
  medium: "500",
  high: "600",
  bold: "700",
} as const;
