const firebaseProjects = {
  development: {
    projectId: 'campus-cats-development',
    projectNumber: '811658613482',
  },
  production: {
    projectId: 'campuscats-d7a5e',
    projectNumber: '488622327541',
  },
};

const requiredVariables = [
  'EXPO_PUBLIC_API_KEY',
  'EXPO_PUBLIC_APP_ID',
  'EXPO_PUBLIC_AUTH_DOMAIN',
  'EXPO_PUBLIC_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_PROJECT_ID',
  'EXPO_PUBLIC_STORAGE_BUCKET',
  'EXPO_PUBLIC_WEB_API_KEY',
  'EXPO_PUBLIC_WEB_APP_ID',
];

const validateFirebaseEnvironment = (environment) => {
  const appEnvironment = environment.EXPO_PUBLIC_APP_ENV;

  if (!appEnvironment) {
    throw new Error('EXPO_PUBLIC_APP_ENV is required');
  }

  const expected = firebaseProjects[appEnvironment];
  if (!expected) {
    throw new Error(`Unsupported app environment: ${appEnvironment}`);
  }

  const label =
    appEnvironment === 'development' ? 'Development' : 'Production';

  for (const key of requiredVariables) {
    if (typeof environment[key] !== 'string' || environment[key].length === 0) {
      throw new Error(
        `${label} app must use ${expected.projectId} Firebase (${key} is required)`,
      );
    }
  }

  const expectedValues = {
    EXPO_PUBLIC_PROJECT_ID: expected.projectId,
    EXPO_PUBLIC_AUTH_DOMAIN: `${expected.projectId}.firebaseapp.com`,
    EXPO_PUBLIC_STORAGE_BUCKET: `${expected.projectId}.firebasestorage.app`,
    EXPO_PUBLIC_MESSAGING_SENDER_ID: expected.projectNumber,
  };

  for (const [key, expectedValue] of Object.entries(expectedValues)) {
    if (environment[key] !== expectedValue) {
      throw new Error(
        `${label} app must use ${expected.projectId} Firebase (${key} mismatch)`,
      );
    }
  }

  for (const key of ['EXPO_PUBLIC_APP_ID', 'EXPO_PUBLIC_WEB_APP_ID']) {
    if (!environment[key].startsWith(`1:${expected.projectNumber}:`)) {
      throw new Error(
        `${label} app must use ${expected.projectId} Firebase (${key} mismatch)`,
      );
    }
  }
};

module.exports = { firebaseProjects, validateFirebaseEnvironment };
