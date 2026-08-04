const requiredVariables = [
  'EXPO_PUBLIC_WEB_API_KEY',
  'EXPO_PUBLIC_WEB_APP_ID',
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]?.trim(),
);

if (missingVariables.length > 0) {
  console.error('Firebase Hosting requires a Firebase Web App configuration:\n');
  console.error(missingVariables.join('\n'));
  console.error(
    '\nCreate or select a Firebase Web App, then add these values to the build environment.',
  );
  process.exit(1);
}

console.log('Firebase Web App environment is configured.');
