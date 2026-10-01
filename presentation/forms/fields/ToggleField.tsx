import { Switch, View } from 'react-native';

import { AppText } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

export const ToggleField = ({
  label,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
}) => {
  const theme = useAppTheme();
  return (
    <View
      style={{
        minHeight: theme.layout.minTouchTarget,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
      }}
    >
      <AppText style={{ flex: 1 }}>{label}</AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primarySurface,
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
};
