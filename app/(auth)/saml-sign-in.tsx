import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage } from '@/components';
import { appModules } from '@/composition/appModules';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { registerForPushNotificationsAsync } from '@/utils/notifications';

const SamlSignIn = () => {
  const router = useRouter();
  const { samlSignIn } = useAuth();
  const [visible, setVisible] = useState(false);

  const signIn = async () => {
    try {
      setVisible(true);
      const result = await samlSignIn();
      if (result.status === 'cancelled') return;
      const token = await registerForPushNotificationsAsync();
      if (token) await appModules.session.registerPushToken(token);
      router.replace('/(app)/(tabs)');
    } catch (error) {
      Alert.alert(
        'SSO sign-in failed',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setVisible(false);
    }
  };

  useEffect(() => {
    void signIn();
  }, []);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage text="Logging in..." visible={visible} setVisible={setVisible} />
      <ScrollView
        contentContainerStyle={containerStyles.scrollViewCenterPadded}
        keyboardShouldPersistTaps="handled"
      >
        <Button
          style={[
            buttonStyles.mediumButton,
            { marginTop: '100%', alignSelf: 'center' },
          ]}
          onPress={() => void signIn()}
        >
          <Text style={textStyles.bigButtonText}>Retry Sign In</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SamlSignIn;
