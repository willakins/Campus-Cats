import { Slot } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/providers';
import { Platform, SafeAreaView } from 'react-native';
import { globalStyles } from '@/styles';

const RootLayout = () => {
  return (
    <PaperProvider>
      <SafeAreaView style = {globalStyles.safeView}>
        <AuthProvider>
          {Platform.OS === 'web' && <script src="https://maps.googleapis.com/maps/api/js?key=<AIzaSyD2koOi8GGUrbCZVju5Dq8Ca_1hxHb1mb8>"></script>}
          <Slot />
        </AuthProvider>
      </SafeAreaView>
    </PaperProvider>
  );
};
export default RootLayout;
//comment code 2
