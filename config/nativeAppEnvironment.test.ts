describe('Native app environment', () => {
  const { validateNativeAppEnvironment } = require('./nativeAppEnvironment');

  it('accepts the development bundle ID for development', () => {
    expect(() =>
      validateNativeAppEnvironment(
        'development',
        'com.gatech.CampusCats.dev',
      ),
    ).not.toThrow();
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

  it('rejects a production Firebase bundle served to the development app', () => {
    expect(() =>
      validateNativeAppEnvironment(
        'production',
        'com.gatech.CampusCats.dev',
      ),
    ).toThrow(
      'com.gatech.CampusCats.dev cannot run the production Firebase environment',
    );
  });

  it('rejects a development Firebase bundle served to the production app', () => {
    expect(() =>
      validateNativeAppEnvironment('development', 'com.gatech.CampusCats'),
    ).toThrow(
      'com.gatech.CampusCats cannot run the development Firebase environment',
    );
  });
});
