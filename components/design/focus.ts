import { Platform, ViewStyle } from 'react-native';

interface WebFocusStyle extends ViewStyle {
  readonly outlineColor: string;
  readonly outlineOffset: number;
  readonly outlineStyle: 'solid';
  readonly outlineWidth: number;
}

export const focusRingStyle = (
  focused: boolean,
  color: string,
  platform = Platform.OS,
): WebFocusStyle | undefined =>
  focused && platform === 'web'
    ? {
        outlineColor: color,
        outlineOffset: 2,
        outlineStyle: 'solid',
        outlineWidth: 3,
      }
    : undefined;
