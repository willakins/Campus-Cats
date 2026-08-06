const createFirebaseConfigurations = (environment) => {
  const sharedFirebaseConfig = {
    authDomain: environment.EXPO_PUBLIC_AUTH_DOMAIN,
    projectId: environment.EXPO_PUBLIC_PROJECT_ID,
    storageBucket: environment.EXPO_PUBLIC_STORAGE_BUCKET,
    messagingSenderId: environment.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  };

  const nativeFirebaseConfig = {
    ...sharedFirebaseConfig,
    apiKey: environment.EXPO_PUBLIC_API_KEY,
    appId: environment.EXPO_PUBLIC_APP_ID,
  };

  const webFirebaseConfig = {
    ...sharedFirebaseConfig,
    apiKey: environment.EXPO_PUBLIC_WEB_API_KEY ?? environment.EXPO_PUBLIC_API_KEY,
    appId: environment.EXPO_PUBLIC_WEB_APP_ID ?? environment.EXPO_PUBLIC_APP_ID,
  };

  const samlConfiguration = {
    apiKey: environment.EXPO_PUBLIC_WEB_API_KEY,
    authDomain: environment.EXPO_PUBLIC_AUTH_DOMAIN,
  };

  return { nativeFirebaseConfig, samlConfiguration, webFirebaseConfig };
};

const {
  nativeFirebaseConfig,
  samlConfiguration,
  webFirebaseConfig,
} = createFirebaseConfigurations({
  EXPO_PUBLIC_API_KEY: process.env.EXPO_PUBLIC_API_KEY,
  EXPO_PUBLIC_APP_ID: process.env.EXPO_PUBLIC_APP_ID,
  EXPO_PUBLIC_AUTH_DOMAIN: process.env.EXPO_PUBLIC_AUTH_DOMAIN,
  EXPO_PUBLIC_PROJECT_ID: process.env.EXPO_PUBLIC_PROJECT_ID,
  EXPO_PUBLIC_STORAGE_BUCKET: process.env.EXPO_PUBLIC_STORAGE_BUCKET,
  EXPO_PUBLIC_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_MESSAGING_SENDER_ID,
  EXPO_PUBLIC_WEB_API_KEY: process.env.EXPO_PUBLIC_WEB_API_KEY,
  EXPO_PUBLIC_WEB_APP_ID: process.env.EXPO_PUBLIC_WEB_APP_ID,
});

export {
  createFirebaseConfigurations,
  nativeFirebaseConfig,
  samlConfiguration,
  webFirebaseConfig,
};
