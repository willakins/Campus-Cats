import { View } from 'react-native';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider as PaperThemeProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  AppSettingsProvider,
  AppToastProvider,
  AuthProvider,
  ClubProvider,
  UniversitySelectionProvider,
  useAppSettings,
} from '@/presentation/providers';
import { verticalStackTransition } from '@/presentation/navigation/stackTransitions';
import { AppThemeProvider, useAppTheme, useReducedMotion } from '@/theme';

const ThemedApplication = () => {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  return (
    <PaperThemeProvider theme={theme.paper}>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            ...verticalStackTransition(reducedMotion),
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
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
      <AppToastProvider>
        <ThemedApplication />
      </AppToastProvider>
    </AppThemeProvider>
  );
};

const RootLayout = () => {
  return (
    <SafeAreaProvider>
      <UniversitySelectionProvider>
        <AuthProvider>
          <ClubProvider>
            <AppSettingsProvider>
              <BrandedApplication />
            </AppSettingsProvider>
          </ClubProvider>
        </AuthProvider>
      </UniversitySelectionProvider>
    </SafeAreaProvider>
  );
};
export default RootLayout;
