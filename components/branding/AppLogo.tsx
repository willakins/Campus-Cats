import React from 'react';
import {
  Image,
  ImageSourcePropType,
  ImageStyle,
  StyleProp,
} from 'react-native';

import { useAppSettings } from '../../providers/AppSettingsContext';

export const DEFAULT_APP_LOGO_SOURCE = require('../../assets/images/default-app-icon.png');

export const resolveAppLogoSource = (logoUrl: string): ImageSourcePropType =>
  logoUrl ? { uri: logoUrl } : DEFAULT_APP_LOGO_SOURCE;

interface AppLogoProps {
  readonly accessibilityLabel?: string;
  readonly source?: ImageSourcePropType;
  readonly style?: StyleProp<ImageStyle>;
}

export const AppLogo = ({
  accessibilityLabel = 'Campus Cats club logo',
  source,
  style,
}: AppLogoProps) => {
  const { settings } = useAppSettings();

  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      resizeMode="contain"
      source={source ?? resolveAppLogoSource(settings.logoUrl)}
      style={style}
    />
  );
};
