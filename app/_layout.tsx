import { View } from 'react-native';

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/providers';
import { AppThemeProvider, useAppTheme } from '@/theme';

const ThemedApplication = () => {
  const theme = useAppTheme();
  return (
    <PaperProvider theme={theme.paper}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Slot />
      </View>
    </PaperProvider>
  );
};

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppThemeProvider>
          <ThemedApplication />
        </AppThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};
export default RootLayout;
