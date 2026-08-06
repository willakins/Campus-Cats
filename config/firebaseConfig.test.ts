describe('Firebase platform configuration', () => {
  it('keeps native credentials separate from browser and SAML credentials', () => {
    const { createFirebaseConfigurations } = require('./firebaseConfig');
    const {
      nativeFirebaseConfig,
      samlConfiguration,
      webFirebaseConfig,
    } = createFirebaseConfigurations({
      EXPO_PUBLIC_API_KEY: 'native-api-key',
      EXPO_PUBLIC_APP_ID: 'native-app-id',
      EXPO_PUBLIC_AUTH_DOMAIN: 'campus-cats.firebaseapp.com',
      EXPO_PUBLIC_PROJECT_ID: 'campus-cats',
      EXPO_PUBLIC_STORAGE_BUCKET: 'campus-cats.appspot.com',
      EXPO_PUBLIC_MESSAGING_SENDER_ID: '1234567890',
      EXPO_PUBLIC_WEB_API_KEY: 'web-api-key',
      EXPO_PUBLIC_WEB_APP_ID: 'web-app-id',
    });

    expect(nativeFirebaseConfig.apiKey).toBe('native-api-key');
    expect(nativeFirebaseConfig.appId).toBe('native-app-id');
    expect(webFirebaseConfig.apiKey).toBe('web-api-key');
    expect(webFirebaseConfig.appId).toBe('web-app-id');
    expect(samlConfiguration).toEqual({
      apiKey: 'web-api-key',
      authDomain: 'campus-cats.firebaseapp.com',
    });
  });
});
