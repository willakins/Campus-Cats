import { View } from 'react-native';

import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as PaperThemeProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AppSettingsProvider,
  AuthProvider,
  ClubProvider,
  useAppSettings,
} from '@/providers';
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
      <ThemedApplication />
    </AppThemeProvider>
  );
};

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ClubProvider>
          <AppSettingsProvider>
            <BrandedApplication />
          </AppSettingsProvider>
        </ClubProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};
export default RootLayout;
