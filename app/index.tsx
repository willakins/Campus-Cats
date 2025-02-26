import React, { useCallback, useEffect } from 'react';
import { Image, SafeAreaView, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingIndicator } from '@/components';
import { auth } from '@/services/firebase';
import { useAuth } from '@/providers';

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
  const { isLoading } = useAuth();

  const onLayoutRootView = useCallback(() => {
    if (!isLoading) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setIsLoading`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [isLoading]);

  if (isLoading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView onLayout={onLayoutRootView} style={styles.splashContainer}>
        <AppSplashScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

export default App;

const AppSplashScreen: React.FC<{}> = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('here');
      if (auth.currentUser) {
        router.push('/(tabs)')
      } else {
        router.push('/login')
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return(
    <Image
      style={styles.splashImage}
      source={require('../assets/images/app-icon.png')}
    />
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
});
