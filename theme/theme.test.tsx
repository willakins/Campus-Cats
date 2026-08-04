import React from 'react';
import { AccessibilityInfo, Text } from 'react-native';

import { render, screen } from '@testing-library/react-native';

import {
  AppThemeProvider,
  createElevation,
  darkTheme,
  lightTheme,
  resolveAppTheme,
  useAppTheme,
  useReducedMotion,
} from './index';

const relativeLuminance = (hex: string): number => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3) throw new Error('Expected an RGB hex color');
  const [red, green, blue] = channels.map((value) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

const ThemeProbe = () => {
  const theme = useAppTheme();
  return <Text>{theme.dark ? 'dark theme' : 'light theme'}</Text>;
};

const MotionProbe = () => {
  const reducedMotion = useReducedMotion();
  return <Text>{reducedMotion ? 'reduced motion' : 'standard motion'}</Text>;
};

describe('Campus Cats themes', () => {
  it('exposes the approved field-guide palettes and feature accents', () => {
    expect(lightTheme.colors).toMatchObject({
      background: '#FFF9F0',
      surface: '#FFFFFF',
      primary: '#18314F',
      gold: '#B58A16',
      coral: '#B94C3C',
      teal: '#287D78',
      success: '#26734D',
      violet: '#8064A2',
    });
    expect(darkTheme.colors).toMatchObject({
      background: '#111A22',
      surface: '#19242E',
      primary: '#F0C85A',
      coral: '#FF8F85',
      teal: '#66C8C0',
      success: '#68D49D',
      violet: '#BBA4E3',
    });
  });

  it.each([
    [lightTheme.colors.text, lightTheme.colors.background],
    [lightTheme.colors.text, lightTheme.colors.surface],
    [lightTheme.colors.onPrimary, lightTheme.colors.primary],
    [darkTheme.colors.text, darkTheme.colors.background],
    [darkTheme.colors.text, darkTheme.colors.surface],
    [darkTheme.colors.onPrimary, darkTheme.colors.primary],
  ])('keeps required text pairs at WCAG AA contrast', (foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it('follows a dark system scheme and defaults safely to light', () => {
    expect(resolveAppTheme('dark')).toBe(darkTheme);
    expect(resolveAppTheme('light')).toBe(lightTheme);
    expect(resolveAppTheme(null)).toBe(lightTheme);
  });

  it('uses web-native box shadows without deprecated React Native shadow props', () => {
    expect(createElevation(false, lightTheme.colors, 'web')).toEqual({
      card: { boxShadow: '0 4px 14px #18314F1A' },
      floating: { boxShadow: '0 8px 24px #18314F2E' },
    });
  });

  it('makes the resolved theme available to rendered children', () => {
    render(
      <AppThemeProvider colorScheme="dark">
        <ThemeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByText('dark theme')).toBeOnTheScreen();
  });

  it('follows the platform Reduce Motion preference', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    render(
      <AppThemeProvider colorScheme="light">
        <MotionProbe />
      </AppThemeProvider>,
    );

    expect(await screen.findByText('reduced motion')).toBeOnTheScreen();
  });
});
