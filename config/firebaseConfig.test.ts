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

describe('Firebase platform configuration', () => {
  it('keeps native credentials separate from browser and SAML credentials', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');
    const {
      nativeFirebaseConfig,
      samlConfiguration,
      webFirebaseConfig,
    } = createFirebaseConfigurations(productionEnvironment);

    expect(nativeFirebaseConfig.apiKey).toBe(
      productionEnvironment.EXPO_PUBLIC_API_KEY,
    );
    expect(nativeFirebaseConfig.appId).toBe(
      productionEnvironment.EXPO_PUBLIC_APP_ID,
    );
    expect(webFirebaseConfig.apiKey).toBe(
      productionEnvironment.EXPO_PUBLIC_WEB_API_KEY,
    );
    expect(webFirebaseConfig.appId).toBe(
      productionEnvironment.EXPO_PUBLIC_WEB_APP_ID,
    );
    expect(samlConfiguration).toEqual({
      apiKey: productionEnvironment.EXPO_PUBLIC_WEB_API_KEY,
      authDomain: productionEnvironment.EXPO_PUBLIC_AUTH_DOMAIN,
    });
  });

  it('requires an explicit app environment', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');

    expect(() => createFirebaseConfigurations({})).toThrow(
      'EXPO_PUBLIC_APP_ENV is required',
    );
  });

  it('rejects a development build configured for production Firebase', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');

    expect(() =>
      createFirebaseConfigurations({
        ...productionEnvironment,
        EXPO_PUBLIC_APP_ENV: 'development',
      }),
    ).toThrow('Development app must use campus-cats-development Firebase');
  });

  it('rejects a production build configured for development Firebase', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');

    expect(() =>
      createFirebaseConfigurations({
        ...developmentEnvironment,
        EXPO_PUBLIC_APP_ENV: 'production',
      }),
    ).toThrow('Production app must use campuscats-d7a5e Firebase');
  });

  it('rejects mixed development and production Firebase credentials', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');

    expect(() =>
      createFirebaseConfigurations({
        EXPO_PUBLIC_APP_ENV: 'development',
        EXPO_PUBLIC_API_KEY: 'native-api-key',
        EXPO_PUBLIC_APP_ID: '1:811658613482:web:nativefixture',
        EXPO_PUBLIC_AUTH_DOMAIN: 'campuscats-d7a5e.firebaseapp.com',
        EXPO_PUBLIC_PROJECT_ID: 'campus-cats-development',
        EXPO_PUBLIC_STORAGE_BUCKET:
          'campus-cats-development.firebasestorage.app',
        EXPO_PUBLIC_MESSAGING_SENDER_ID: '811658613482',
        EXPO_PUBLIC_WEB_API_KEY: 'web-api-key',
        EXPO_PUBLIC_WEB_APP_ID: '1:811658613482:web:webfixture',
      }),
    ).toThrow('EXPO_PUBLIC_AUTH_DOMAIN mismatch');
  });

  it('rejects app identifiers issued by the other Firebase project', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');

    expect(() =>
      createFirebaseConfigurations({
        ...productionEnvironment,
        EXPO_PUBLIC_APP_ID: '1:811658613482:web:nativefixture',
      }),
    ).toThrow('EXPO_PUBLIC_APP_ID mismatch');
  });
});
