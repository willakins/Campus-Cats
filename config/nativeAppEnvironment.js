const nativeBundleIdentifiers = {
  development: 'com.gatech.CampusCats.dev',
  production: 'com.gatech.CampusCats',
};
const expoGoApplicationId = 'host.exp.Exponent';

const validateNativeAppEnvironment = (appEnvironment, applicationId) => {
  const expectedApplicationId = nativeBundleIdentifiers[appEnvironment];

  if (!expectedApplicationId) {
    throw new Error(`Unsupported native app environment: ${appEnvironment}`);
  }

  const isDevelopmentInExpoGo =
    appEnvironment === 'development' && applicationId === expoGoApplicationId;

  if (applicationId !== expectedApplicationId && !isDevelopmentInExpoGo) {
    throw new Error(
      `${applicationId ?? 'Unknown native app'} cannot run the ${appEnvironment} Firebase environment`,
    );
  }
};

module.exports = { nativeBundleIdentifiers, validateNativeAppEnvironment };
