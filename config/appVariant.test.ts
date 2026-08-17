const baseConfig = require('../app.json').expo;

const developmentEnvironment = {
  EXPO_PUBLIC_API_KEY: 'native-api-key',
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_APP_ID: '1:811658613482:web:nativefixture',
  EXPO_PUBLIC_AUTH_DOMAIN: 'campus-cats-development.firebaseapp.com',
  EXPO_PUBLIC_MESSAGING_SENDER_ID: '811658613482',
  EXPO_PUBLIC_PROJECT_ID: 'campus-cats-development',
  EXPO_PUBLIC_STORAGE_BUCKET:
    'campus-cats-development.firebasestorage.app',
  EXPO_PUBLIC_WEB_API_KEY: 'web-api-key',
  EXPO_PUBLIC_WEB_APP_ID: '1:811658613482:web:webfixture',
};

const productionEnvironment = {
  EXPO_PUBLIC_API_KEY: 'native-api-key',
  EXPO_PUBLIC_APP_ENV: 'production',
  EXPO_PUBLIC_APP_ID: '1:488622327541:web:nativefixture',
  EXPO_PUBLIC_AUTH_DOMAIN: 'campuscats-d7a5e.firebaseapp.com',
  EXPO_PUBLIC_MESSAGING_SENDER_ID: '488622327541',
  EXPO_PUBLIC_PROJECT_ID: 'campuscats-d7a5e',
  EXPO_PUBLIC_STORAGE_BUCKET: 'campuscats-d7a5e.firebasestorage.app',
  EXPO_PUBLIC_WEB_API_KEY: 'web-api-key',
  EXPO_PUBLIC_WEB_APP_ID: '1:488622327541:web:webfixture',
};

describe('Expo app variants', () => {
  it('resolves an isolated development app identity', () => {
    const resolveAppConfig = require('../app.config');

    const config = resolveAppConfig({
      config: baseConfig,
      environment: developmentEnvironment,
    });

    expect(config.name).toBe('Campus Cats Dev');
    expect(config.ios.bundleIdentifier).toBe('com.gatech.CampusCats.dev');
    expect(config.ios.googleServicesFile).toBe(
      './GoogleService-Info.development.plist',
    );
    expect(config.android.package).toBe('com.gatech.CampusCats.dev');
  });

  it('rejects a development app identity pointed at production Firebase', () => {
    const resolveAppConfig = require('../app.config');

    expect(() =>
      resolveAppConfig({
        config: baseConfig,
        environment: {
          ...developmentEnvironment,
          EXPO_PUBLIC_PROJECT_ID: 'campuscats-d7a5e',
        },
      }),
    ).toThrow('Development app must use campus-cats-development Firebase');
  });

  it('requires an explicit app environment', () => {
    const resolveAppConfig = require('../app.config');

    expect(() =>
      resolveAppConfig({ config: baseConfig, environment: {} }),
    ).toThrow('EXPO_PUBLIC_APP_ENV is required');
  });

  it('preserves the existing production app identity', () => {
    const resolveAppConfig = require('../app.config');

    const config = resolveAppConfig({
      config: baseConfig,
      environment: productionEnvironment,
    });

    expect(config.name).toBe('Campus Cats');
    expect(config.ios.bundleIdentifier).toBe('com.gatech.CampusCats');
    expect(config.ios.googleServicesFile).toBeUndefined();
    expect(config.android.package).toBe('com.gatech.CampusCats');
  });

  it('loads internal EAS builds from the development EAS environment', () => {
    const eas = require('../eas.json');

    for (const profile of ['development', 'preview']) {
      expect(eas.build[profile].environment).toBe('development');
      expect(eas.build[profile].env).toBeUndefined();
    }
  });

  it('loads production builds from the production EAS environment', () => {
    const eas = require('../eas.json');

    expect(eas.build.production.environment).toBe('production');
    expect(eas.build.production.env).toBeUndefined();
  });

  it('uses the EAS file variable for the development Firebase plist', () => {
    const resolveAppConfig = require('../app.config');

    const config = resolveAppConfig({
      config: baseConfig,
      environment: {
        ...developmentEnvironment,
        GOOGLE_SERVICES_PLIST: '/eas/files/GoogleService-Info.plist',
      },
    });

    expect(config.ios.googleServicesFile).toBe(
      '/eas/files/GoogleService-Info.plist',
    );
  });
});
