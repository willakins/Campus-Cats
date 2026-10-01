import React, { ReactNode } from 'react';
import { View } from 'react-native';

import { AppText } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

interface ListItemHeaderProps {
  readonly title: string;
  readonly trailing?: ReactNode;
}

export const ListItemHeader = ({ title, trailing }: ListItemHeaderProps) => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
      }}
    >
      <AppText variant="cardTitle" numberOfLines={1} style={{ flex: 1 }}>
        {title}
      </AppText>
      {trailing}
    </View>
  );
};
