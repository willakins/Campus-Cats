const nativeBundleIdentifiers = {
  development: 'com.gatech.CampusCats.dev',
  production: 'com.gatech.CampusCats',
};

const validateNativeAppEnvironment = (appEnvironment, applicationId) => {
  const expectedApplicationId = nativeBundleIdentifiers[appEnvironment];

  if (!expectedApplicationId) {
    throw new Error(`Unsupported native app environment: ${appEnvironment}`);
  }

  if (applicationId !== expectedApplicationId) {
    throw new Error(
      `${applicationId ?? 'Unknown native app'} cannot run the ${appEnvironment} Firebase environment`,
    );
  }
};

module.exports = { nativeBundleIdentifiers, validateNativeAppEnvironment };
