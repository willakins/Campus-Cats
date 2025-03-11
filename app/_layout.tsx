import { Slot } from 'expo-router';

import { AuthProvider } from '@/providers';
import { SafeAreaView } from 'react-native';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const RootLayout = () => {
  return (
    <SafeAreaView style = {globalStyles.safeView}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </SafeAreaView>
  );
};
export default RootLayout;