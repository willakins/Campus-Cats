import React, { useCallback, useEffect, useState } from 'react';
import { Image, SafeAreaView, StyleSheet } from 'react-native';

import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  const [isAppReady, setAppReady] = useState<boolean>(false);

  useEffect(() => {
    async function prepare() {
      /* If we need to load anything, do so here */
      setAppReady(true);
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(() => {
    if (isAppReady) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      SplashScreen.hide();
    }
  }, [isAppReady]);

  if (!isAppReady) {
    return null;
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
      router.push('/login')
    }, 1000);

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
