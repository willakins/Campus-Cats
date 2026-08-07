import { View } from 'react-native';

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as PaperThemeProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppSettingsProvider, AuthProvider, useAppSettings } from '@/providers';
import { AppThemeProvider, useAppTheme } from '@/theme';

const ThemedApplication = () => {
  const theme = useAppTheme();
  return (
    <PaperThemeProvider theme={theme.paper}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Slot />
      </View>
    </PaperThemeProvider>
  );
};

const BrandedApplication = () => {
  const { settings } = useAppSettings();
  return (
    <AppThemeProvider
      brandColors={{
        primaryColor: settings.primaryColor,
        accentColor: settings.accentColor,
      }}
    >
      <AuthProvider>
        <ThemedApplication />
      </AuthProvider>
    </AppThemeProvider>
  );
};

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <AppSettingsProvider>
        <BrandedApplication />
      </AppSettingsProvider>
    </SafeAreaProvider>
  );
};
export default RootLayout;
