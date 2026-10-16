const {
  hasFirebaseEnvironmentVariables,
  validateAppEnvironment,
  validateFirebaseEnvironment,
} = require('./config/firebaseEnvironments');

module.exports = ({ config, environment = process.env }) => {
  validateAppEnvironment(environment);
  if (hasFirebaseEnvironmentVariables(environment)) {
    validateFirebaseEnvironment(environment);
  }

  const development = environment.EXPO_PUBLIC_APP_ENV === 'development';

  return {
    ...config,
    name: development ? 'Campus Cats Dev' : config.name,
    ios: {
      ...config.ios,
      bundleIdentifier: development
        ? 'com.gatech.CampusCats.dev'
        : config.ios.bundleIdentifier,
      googleServicesFile:
        environment.GOOGLE_SERVICES_PLIST ??
        (development
          ? './GoogleService-Info.development.plist'
          : './GoogleService-Info.production.plist'),
    },
    android: {
      ...config.android,
      package: development
        ? 'com.codecrate.campuscats.dev'
        : config.android.package,
      googleServicesFile:
        environment.GOOGLE_SERVICES_JSON ??
        (development ? undefined : './google-services.production.json'),
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
