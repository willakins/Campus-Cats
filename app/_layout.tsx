import { SafeAreaView } from 'react-native';

import { Slot } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/providers';
import { globalStyles } from '@/styles';

const RootLayout = () => {
  return (
    <AuthProvider>
      <SafeAreaView style = {globalStyles.safeView}>
        <PaperProvider>
          <Slot />
        </PaperProvider>
      </SafeAreaView>
    </AuthProvider>
  );
};
export default RootLayout;
