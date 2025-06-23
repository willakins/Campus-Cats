import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { LoadingIndicator } from '@/components';
import { auth } from '@/config/firebase';
import { useAuth } from '@/providers';
import { globalStyles } from '@/styles';

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
  const { loading, user } = useAuth(); // Make sure useAuth returns user too

  // Use useEffect to handle splash screen hiding
  useEffect(() => {
    if (!loading) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setIsLoading`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [loading]);

  // Early return for loading state
  // NOTE: If we try to redirect immediately, the useEffect never has time to
  // hide the splashscreen.
  if (loading) {
    return <LoadingIndicator />;
  }

  if (auth.currentUser) {
    return <Redirect href="/(app)/(tabs)" />;
  } else {
    return <Redirect href="/login" />;
  }
};

export default App;
