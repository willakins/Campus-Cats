import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { AppText, StatusPill } from '../design';

export const SurveyPrivacyBanner = ({ anonymous }: { readonly anonymous: boolean }) => {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={
        anonymous
          ? 'Anonymous survey. Officers can see your answers, but your name and email are not attached.'
          : 'Named survey. Officers will see your name and email with your answers.'
      }
      style={{
        gap: theme.spacing.xs,
        padding: theme.spacing.md,
        borderRadius: theme.radii.card,
        backgroundColor: anonymous
          ? theme.colors.infoSurface
          : theme.colors.warningSurface,
      }}
    >
      <StatusPill
        tone={anonymous ? 'info' : 'warning'}
        label={anonymous ? 'Anonymous response' : 'Response includes your name'}
        icon={anonymous ? 'eye-off-outline' : 'person-outline'}
      />
      <AppText>
        {anonymous
          ? 'Officers can see your answers, but your name and email are not attached. A private receipt only prevents duplicate submissions.'
          : 'Officers will see your account identity with these answers. You can submit this survey once.'}
      </AppText>
    </View>
  );
};
