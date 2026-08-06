const fs = require('fs');
const path = require('path');
const { load } = require('@expo/env');

const projectRoot = path.resolve(__dirname, '..');
load(projectRoot, { silent: true });
const firebaseConfig = JSON.parse(
  fs.readFileSync(path.join(projectRoot, 'firebase.json'), 'utf8'),
);
const hosting = Array.isArray(firebaseConfig.hosting)
  ? firebaseConfig.hosting[0]
  : firebaseConfig.hosting;
const violations = [];

if (!hosting) {
  violations.push('Firebase Hosting is not configured.');
} else {
  if (hosting.public !== 'dist') {
    violations.push(`Hosting must serve the Expo web output in dist, not ${hosting.public}.`);
  }

  if (!hosting.cleanUrls) {
    violations.push('Hosting must enable cleanUrls for Expo Router static routes.');
  }

  const hasAppFallback = hosting.rewrites?.some(
    ({ source, destination }) => source === '**' && destination === '/index.html',
  );
  if (!hasAppFallback) {
    violations.push('Hosting must fall back to /index.html for client-side routes.');
  }

  if (!hosting.predeploy?.includes('npm run hosting:build')) {
    violations.push('Hosting must build the Expo web app before deployment.');
  }
}

const legacyEntryPath = path.join(projectRoot, 'public', 'index.html');
if (fs.existsSync(legacyEntryPath)) {
  const legacyEntry = fs.readFileSync(legacyEntryPath, 'utf8');
  if (/Firebase Hosting Setup Complete/i.test(legacyEntry)) {
    violations.push('Remove the Firebase Hosting setup placeholder from public/index.html.');
  }
}

const outputPath = path.join(projectRoot, 'dist');
if (fs.existsSync(outputPath)) {
  const outputEntryPath = path.join(outputPath, 'index.html');
  const samlBridgePath = path.join(outputPath, 'firebase-wrapper-app.html');
  const samlBridgeScriptPath = path.join(outputPath, 'firebase-wrapper-app.js');

  if (!fs.existsSync(outputEntryPath)) {
    violations.push('The Hosting output is missing dist/index.html.');
  } else {
    const outputEntry = fs.readFileSync(outputEntryPath, 'utf8');
    if (/Firebase Hosting Setup Complete/i.test(outputEntry) || !outputEntry.includes('id="root"')) {
      violations.push('dist/index.html is not an Expo application entry point.');
    }
  }

  if (!fs.existsSync(samlBridgePath)) {
    violations.push('The Hosting output is missing the Firebase SAML bridge.');
  }

  if (!fs.existsSync(samlBridgeScriptPath)) {
    violations.push('The Hosting output is missing the Firebase SAML bridge script.');
  }

  const bundleDirectory = path.join(outputPath, '_expo', 'static', 'js', 'web');
  if (fs.existsSync(bundleDirectory)) {
    const bundle = fs
      .readdirSync(bundleDirectory)
      .filter((file) => file.endsWith('.js'))
      .map((file) => fs.readFileSync(path.join(bundleDirectory, file), 'utf8'))
      .join('\n');
    for (const variable of ['EXPO_PUBLIC_WEB_API_KEY', 'EXPO_PUBLIC_WEB_APP_ID']) {
      const value = process.env[variable];
      if (value && !bundle.includes(value)) {
        violations.push(`Expo did not inline ${variable} into the web bundle.`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error('Firebase Hosting check failed:\n');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('Firebase Hosting is configured to serve the Expo web app.');
