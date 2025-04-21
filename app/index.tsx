import React, { useCallback, useEffect, useState, useRef } from 'react';

import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';

import { LoadingIndicator } from '@/components';
import { auth } from '@/config/firebase';
import { useAuth } from '@/providers';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// Handle how notifications are displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const App = () => {
  const { loading, user } = useAuth(); // Make sure useAuth returns user too
  
  // Use useEffect to handle splash screen hiding
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register notification listeners (not push token) — safe to keep here
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) Notifications.removeNotificationSubscription(notificationListener.current);
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

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
