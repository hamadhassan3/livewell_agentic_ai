/**
 * Hook for consistent color theming across the app.
 * Single theme configuration - no dark mode support.
 */

import { Colors } from '@/constants/Colors';

export function useThemeColor(
  props: { color?: string },
  colorName: keyof typeof Colors
) {
  const colorFromProps = props.color;

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[colorName];
  }
}
