import React, { createContext, useContext, useMemo } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';

import { AppTheme, resolveAppTheme } from './tokens';

const ThemeContext = createContext<AppTheme | undefined>(undefined);

interface AppThemeProviderProps {
  readonly children: React.ReactNode;
  readonly colorScheme?: ColorSchemeName;
}

export const AppThemeProvider = ({
  children,
  colorScheme,
}: AppThemeProviderProps) => {
  const systemScheme = useColorScheme();
  const theme = resolveAppTheme(colorScheme ?? systemScheme);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
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
