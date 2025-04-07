import React, { useCallback, useEffect } from 'react';
import { Image, SafeAreaView } from 'react-native';

import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { LoadingIndicator } from '@/components';
import { auth } from '@/config/firebase';
import { useAuth } from '@/providers';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

// Instruct SplashScreen not to hide yet, we want to do this manually
SplashScreen.preventAutoHideAsync().catch(() => {
  /* reloading the app might trigger some race conditions, ignore them */
});

// Set the animation options. This is optional.
SplashScreen.setOptions({
  duration: 1000,
  fade: true,
});

const App = () => {
  const { loading } = useAuth();
  const router = useRouter();

  // Handle navigation after loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (auth.currentUser) {
        router.replace('/(app)/(tabs)');
      } else {
        router.replace('/login');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [loading, router]);

  const onLayoutRootView = useCallback(() => {
    if (!loading) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setIsLoading`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [loading]);

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView onLayout={onLayoutRootView} style={globalStyles.screen} />
  );
};

export default App;
