describe('Native app environment', () => {
  const { validateNativeAppEnvironment } = require('./nativeAppEnvironment');

  it.each(['com.gatech.CampusCats.dev', 'com.codecrate.campuscats.dev'])(
    'accepts %s for development',
    (applicationId) => {
      expect(() =>
        validateNativeAppEnvironment('development', applicationId),
      ).not.toThrow();
    },
  );

  it.each(['com.gatech.CampusCats', 'com.codecrate.campuscats'])(
    'accepts %s for production',
    (applicationId) => {
      expect(() =>
        validateNativeAppEnvironment('production', applicationId),
      ).not.toThrow();
    },
  );

  it('rejects an unrelated application ID', () => {
    expect(() =>
      validateNativeAppEnvironment('production', 'com.example.unrelated'),
    ).toThrow(
      'com.example.unrelated cannot run the production Firebase environment',
    );
  });

  it('accepts Expo Go for the development environment', () => {
    expect(() =>
      validateNativeAppEnvironment('development', 'host.exp.Exponent'),
    ).not.toThrow();
  });

  it('rejects Expo Go for the production environment', () => {
    expect(() =>
      validateNativeAppEnvironment('production', 'host.exp.Exponent'),
    ).toThrow(
      'host.exp.Exponent cannot run the production Firebase environment',
    );
  });

  it.each(['com.gatech.CampusCats.dev', 'com.codecrate.campuscats.dev'])(
    'rejects production Firebase in %s',
    (applicationId) => {
      expect(() =>
        validateNativeAppEnvironment('production', applicationId),
      ).toThrow(
        `${applicationId} cannot run the production Firebase environment`,
      );
    },
  );

  it.each(['com.gatech.CampusCats', 'com.codecrate.campuscats'])(
    'rejects development Firebase in %s',
    (applicationId) => {
      expect(() =>
        validateNativeAppEnvironment('development', applicationId),
      ).toThrow(
        `${applicationId} cannot run the development Firebase environment`,
      );
    },
  );
});
