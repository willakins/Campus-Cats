import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '@/components/design';
import { useAppTheme } from '@/theme';

export const LegalLinks = () => {
  const router = useRouter();
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.xxs }}>
      <Button
        label="Terms of Service"
        variant="tertiary"
        size="small"
        onPress={() => router.push('/legal/terms' as never)}
      />
      <Button
        label="Privacy Policy"
        variant="tertiary"
        size="small"
        onPress={() => router.push('/legal/privacy' as never)}
      />
    </View>
  );
};
