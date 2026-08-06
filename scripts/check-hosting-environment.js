const { load } = require('@expo/env');

load(process.cwd(), { silent: true });

const requiredVariables = [
  'EXPO_PUBLIC_WEB_API_KEY',
  'EXPO_PUBLIC_WEB_APP_ID',
  'EXPO_PUBLIC_GOOGLE_MAPS_API_KEY',
];

const missingVariables = requiredVariables.filter(
  (variable) => !process.env[variable]?.trim(),
);

if (missingVariables.length > 0) {
  console.error('Web hosting requires Firebase and Google Maps configuration:\n');
  console.error(missingVariables.join('\n'));
  console.error(
    '\nConfigure the Firebase Web App and Maps JavaScript API key, then add these values to the build environment.',
  );
  process.exit(1);
}

console.log('Web hosting environment is configured.');
