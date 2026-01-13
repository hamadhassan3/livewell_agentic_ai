import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

export function useMediaQuery() {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  const isMobile = dimensions.width < BREAKPOINTS.tablet;
  const isTablet = dimensions.width >= BREAKPOINTS.tablet && dimensions.width < BREAKPOINTS.desktop;
  const isDesktop = dimensions.width >= BREAKPOINTS.desktop;
  const isWide = dimensions.width >= BREAKPOINTS.wide;

  return {
    ...dimensions,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
    // Helper to check if we should show mobile layout
    isMobileLayout: Platform.OS !== 'web' || isMobile,
  };
}
