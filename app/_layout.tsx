import { Slot } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/providers';
import { SafeAreaView } from 'react-native';
import { globalStyles } from '@/styles';

const RootLayout = () => {
  return (
    <PaperProvider>
      <SafeAreaView style = {globalStyles.safeView}>
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </SafeAreaView>
    </PaperProvider>
  );
};
export default RootLayout;
