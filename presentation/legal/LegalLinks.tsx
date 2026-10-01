import { View } from 'react-native';

import { useRouter } from 'expo-router';

import { Button } from '@/presentation/ui';
import { useAppTheme } from '@/theme';

export const LegalLinks = ({ returnTo }: { readonly returnTo: string }) => {
  const router = useRouter();
  const theme = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.spacing.xxs }}>
      <Button
        label="Terms of Service"
        variant="tertiary"
        size="small"
        onPress={() =>
          router.push({ pathname: '/legal/terms', params: { returnTo } } as never)
        }
      />
      <Button
        label="Privacy Policy"
        variant="tertiary"
        size="small"
        onPress={() =>
          router.push({ pathname: '/legal/privacy', params: { returnTo } } as never)
        }
      />
    </View>
  );
};
