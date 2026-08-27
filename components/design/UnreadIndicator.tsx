import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';

export const UnreadIndicator = ({
  accessibilityLabel = 'Unread',
}: {
  readonly accessibilityLabel?: string;
}) => {
  const theme = useAppTheme();

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={{
        width: 10,
        height: 10,
        borderRadius: theme.radii.pill,
        backgroundColor: theme.colors.unread,
      }}
    />
  );
};
