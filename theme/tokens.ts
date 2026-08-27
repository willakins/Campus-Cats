import { Platform, TextStyle, ViewStyle } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';

export type AppColorScheme = 'light' | 'dark';

export interface AppBrandColors {
  readonly primaryColor: string;
  readonly accentColor: string;
}

export interface AppColors {
  readonly background: string;
  readonly surface: string;
  readonly surfaceSubtle: string;
  readonly text: string;
  readonly textMuted: string;
  readonly border: string;
  readonly primary: string;
  readonly onPrimary: string;
  readonly primarySurface: string;
  readonly gold: string;
  readonly goldSurface: string;
  readonly coral: string;
  readonly coralSurface: string;
  readonly teal: string;
  readonly tealSurface: string;
  readonly violet: string;
  readonly violetSurface: string;
  readonly success: string;
  readonly successSurface: string;
  readonly warning: string;
  readonly warningSurface: string;
  readonly unread: string;
  readonly danger: string;
  readonly dangerSurface: string;
  readonly info: string;
  readonly infoSurface: string;
  readonly shadow: string;
  readonly overlay: string;
}

export interface AppTheme {
  readonly dark: boolean;
  readonly colors: AppColors;
  readonly spacing: {
    readonly xxs: 4;
    readonly xs: 8;
    readonly sm: 12;
    readonly md: 16;
    readonly lg: 20;
    readonly xl: 24;
    readonly xxl: 32;
    readonly xxxl: 40;
    readonly huge: 48;
  };
  readonly radii: {
    readonly field: 12;
    readonly chip: 16;
    readonly card: 20;
    readonly sheet: 28;
    readonly pill: 999;
  };
  readonly typography: {
    readonly display: TextStyle;
    readonly pageTitle: TextStyle;
    readonly section: TextStyle;
    readonly cardTitle: TextStyle;
    readonly body: TextStyle;
    readonly label: TextStyle;
    readonly caption: TextStyle;
  };
  readonly elevation: {
    readonly card: ViewStyle;
    readonly floating: ViewStyle;
  };
  readonly layout: {
    readonly screenGutter: 20;
    readonly maxContentWidth: 720;
    readonly maxAuthWidth: 480;
    readonly minTouchTarget: 44;
  };
  readonly motion: {
    readonly press: 140;
    readonly content: 220;
  };
  readonly paper: MD3Theme;
}

const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

const radii = { field: 12, chip: 16, card: 20, sheet: 28, pill: 999 } as const;

const typography = {
  display: { fontSize: 32, lineHeight: 38, fontWeight: '800' },
  pageTitle: { fontSize: 28, lineHeight: 34, fontWeight: '800' },
  section: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  cardTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
} as const satisfies AppTheme['typography'];

const layout = {
  screenGutter: 20,
  maxContentWidth: 720,
  maxAuthWidth: 480,
  minTouchTarget: 44,
} as const;

const motion = { press: 140, content: 220 } as const;

const lightColors: AppColors = {
  background: '#FFF9F0',
  surface: '#FFFFFF',
  surfaceSubtle: '#F5EAD2',
  text: '#22241F',
  textMuted: '#62645C',
  border: '#DDD4C3',
  primary: '#18314F',
  onPrimary: '#FFFFFF',
  primarySurface: '#E2E8EF',
  gold: '#B58A16',
  goldSurface: '#F8EDCA',
  coral: '#B94C3C',
  coralSurface: '#F9E2DD',
  teal: '#287D78',
  tealSurface: '#DDEDEA',
  violet: '#8064A2',
  violetSurface: '#ECE6F3',
  success: '#26734D',
  successSurface: '#DFEFE6',
  warning: '#9A6500',
  warningSurface: '#F8EDCA',
  unread: '#C65F00',
  danger: '#B23A3A',
  dangerSurface: '#F8DEDE',
  info: '#28647D',
  infoSurface: '#DFEBF1',
  shadow: '#18314F',
  overlay: '#111A22B8',
};

const darkColors: AppColors = {
  background: '#111A22',
  surface: '#19242E',
  surfaceSubtle: '#22303C',
  text: '#F7F1E5',
  textMuted: '#BAC0BF',
  border: '#3A4A55',
  primary: '#F0C85A',
  onPrimary: '#241B05',
  primarySurface: '#3C3212',
  gold: '#F0C85A',
  goldSurface: '#3C3212',
  coral: '#FF8F85',
  coralSurface: '#45282B',
  teal: '#66C8C0',
  tealSurface: '#163C3B',
  violet: '#BBA4E3',
  violetSurface: '#332A43',
  success: '#68D49D',
  successSurface: '#183A2D',
  warning: '#F0C85A',
  warningSurface: '#3C3212',
  unread: '#FF9A3D',
  danger: '#FF8F85',
  dangerSurface: '#45282B',
  info: '#78C6E5',
  infoSurface: '#18333F',
  shadow: '#000000',
  overlay: '#000000C7',
};

const paperTheme = (dark: boolean, colors: AppColors): MD3Theme => ({
  ...(dark ? MD3DarkTheme : MD3LightTheme),
  dark,
  colors: {
    ...(dark ? MD3DarkTheme.colors : MD3LightTheme.colors),
    primary: colors.primary,
    onPrimary: colors.onPrimary,
    primaryContainer: colors.primarySurface,
    onPrimaryContainer: colors.text,
    secondary: colors.teal,
    onSecondary: dark ? colors.background : colors.surface,
    secondaryContainer: colors.tealSurface,
    onSecondaryContainer: colors.text,
    error: colors.danger,
    onError: dark ? colors.background : colors.surface,
    errorContainer: colors.dangerSurface,
    onErrorContainer: colors.text,
    background: colors.background,
    onBackground: colors.text,
    surface: colors.surface,
    onSurface: colors.text,
    surfaceVariant: colors.surfaceSubtle,
    onSurfaceVariant: colors.textMuted,
    outline: colors.border,
    shadow: colors.shadow,
    backdrop: colors.overlay,
  },
});

export const createElevation = (
  dark: boolean,
  colors: AppColors,
  platform: string = Platform.OS,
): AppTheme['elevation'] => {
  if (dark) {
    return {
      card: { borderWidth: 1, borderColor: colors.border },
      floating: { borderWidth: 1, borderColor: colors.border },
    };
  }

  if (platform === 'web') {
    return {
      card: { boxShadow: `0 4px 14px ${colors.shadow}1A` },
      floating: { boxShadow: `0 8px 24px ${colors.shadow}2E` },
    };
  }

  return {
    card: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 14,
      elevation: 2,
    },
    floating: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 5,
    },
  };
};

const createTheme = (dark: boolean, colors: AppColors): AppTheme => ({
  dark,
  colors,
  spacing,
  radii,
  typography,
  elevation: createElevation(dark, colors),
  layout,
  motion,
  paper: paperTheme(dark, colors),
});

export const lightTheme = createTheme(false, lightColors);
export const darkTheme = createTheme(true, darkColors);

const rgb = (hex: string): readonly [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const hex = (channels: readonly number[]): string =>
  `#${channels
    .map((channel) => Math.round(channel).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();

const mix = (
  foreground: string,
  background: string,
  amount: number,
): string => {
  const front = rgb(foreground);
  const back = rgb(background);
  return hex(
    front.map(
      (channel, index) => channel * amount + back[index] * (1 - amount),
    ),
  );
};

const luminance = (color: string): number => {
  const channels = rgb(color)
    .map((channel) => channel / 255)
    .map((channel) =>
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (left: string, right: string): number => {
  const lighter = Math.max(luminance(left), luminance(right));
  const darker = Math.min(luminance(left), luminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};

const accessibleAgainst = (
  seed: string,
  background: string,
  dark: boolean,
): string => {
  const target = dark ? '#FFFFFF' : '#000000';
  for (let step = 0; step <= 20; step += 1) {
    const candidate = mix(target, seed, step / 20);
    if (contrast(candidate, background) >= 4.5) return candidate;
  }
  return target;
};

const foregroundFor = (background: string): string =>
  contrast('#FFFFFF', background) >= contrast('#000000', background)
    ? '#FFFFFF'
    : '#000000';

export const createBrandedTheme = (
  dark: boolean,
  brand: AppBrandColors,
): AppTheme => {
  const base = dark ? darkColors : lightColors;
  const primary = accessibleAgainst(brand.primaryColor, base.background, dark);
  const accent = accessibleAgainst(brand.accentColor, base.background, dark);
  return createTheme(dark, {
    ...base,
    primary,
    onPrimary: foregroundFor(primary),
    primarySurface: mix(primary, base.surface, dark ? 0.22 : 0.12),
    gold: accent,
    goldSurface: mix(accent, base.surface, dark ? 0.22 : 0.12),
    warning: accent,
    warningSurface: mix(accent, base.surface, dark ? 0.22 : 0.12),
    shadow: dark ? base.shadow : primary,
  });
};

export const resolveAppTheme = (
  scheme: string | null | undefined,
  brand?: AppBrandColors,
): AppTheme => {
  const dark = scheme === 'dark';
  return brand
    ? createBrandedTheme(dark, brand)
    : dark
      ? darkTheme
      : lightTheme;
};
