const { validateFirebaseEnvironment } = require('./config/firebaseEnvironments');

module.exports = ({ config, environment = process.env }) => {
  validateFirebaseEnvironment(environment);

  const development = environment.EXPO_PUBLIC_APP_ENV === 'development';

  return {
    ...config,
    name: development ? 'Campus Cats Dev' : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: development
        ? 'com.gatech.CampusCats.dev'
        : config.ios.bundleIdentifier,
      ...(development
        ? {
            googleServicesFile:
              environment.GOOGLE_SERVICES_PLIST ??
              './GoogleService-Info.development.plist',
          }
        : {}),
    },
    android: {
      ...config.android,
      package: development
        ? 'com.gatech.CampusCats.dev'
        : config.android.package,
    },
    plugins: [
      ...(config.plugins ?? []),
      [
        'react-native-maps',
        {
          iosGoogleMapsApiKey: environment.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
          androidGoogleMapsApiKey: environment.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      ],
    ],
    extra: {
      ...config.extra,
      appEnvironment: development ? 'development' : 'production',
    },
  };
};
