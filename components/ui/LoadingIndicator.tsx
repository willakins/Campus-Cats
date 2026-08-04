import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { AppText } from '../design';

export const LoadingIndicator = ({ label = 'Getting things ready…' }: { label?: string }) => {
  const theme = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.background,
      }}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText color="muted">{label}</AppText>
    </View>
  );
};
