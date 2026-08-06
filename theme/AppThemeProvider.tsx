import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, ColorSchemeName, useColorScheme } from 'react-native';

import { AppBrandColors, AppTheme, resolveAppTheme } from './tokens';

const ThemeContext = createContext<AppTheme | undefined>(undefined);
const ReducedMotionContext = createContext(false);

interface AppThemeProviderProps {
  readonly children: React.ReactNode;
  readonly colorScheme?: ColorSchemeName;
  readonly brandColors?: AppBrandColors;
}

export const AppThemeProvider = ({
  children,
  colorScheme,
  brandColors,
}: AppThemeProviderProps) => {
  const systemScheme = useColorScheme();
  const theme = useMemo(
    () => resolveAppTheme(colorScheme ?? systemScheme, brandColors),
    [brandColors?.accentColor, brandColors?.primaryColor, colorScheme, systemScheme],
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReducedMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      <ReducedMotionContext.Provider value={reducedMotion}>
        {children}
      </ReducedMotionContext.Provider>
    </ThemeContext.Provider>
  );
};

export const useAppTheme = (): AppTheme => {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useAppTheme must be used within AppThemeProvider');
  return theme;
};

export const useThemedStyles = <Styles,>(
  factory: (theme: AppTheme) => Styles,
): Styles => {
  const theme = useAppTheme();
  return useMemo(() => factory(theme), [factory, theme]);
};

export const useReducedMotion = (): boolean => useContext(ReducedMotionContext);
