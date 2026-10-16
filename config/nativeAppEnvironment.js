const nativeApplicationIds = {
  development: ['com.gatech.CampusCats.dev', 'com.codecrate.campuscats.dev'],
  production: ['com.gatech.CampusCats', 'com.codecrate.campuscats'],
};
const expoGoApplicationId = 'host.exp.Exponent';

const validateNativeAppEnvironment = (appEnvironment, applicationId) => {
  const expectedApplicationIds = nativeApplicationIds[appEnvironment];

  if (!expectedApplicationIds) {
    throw new Error(`Unsupported native app environment: ${appEnvironment}`);
  }

  const isDevelopmentInExpoGo =
    appEnvironment === 'development' && applicationId === expoGoApplicationId;

  if (
    !expectedApplicationIds.includes(applicationId) &&
    !isDevelopmentInExpoGo
  ) {
    throw new Error(
      `${applicationId ?? 'Unknown native app'} cannot run the ${appEnvironment} Firebase environment`,
    );
  }
};

module.exports = { nativeApplicationIds, validateNativeAppEnvironment };
