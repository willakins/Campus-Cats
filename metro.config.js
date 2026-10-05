const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Expo's development env context scans every .env* file. Server credentials must
// never become a module or appear in a client-facing transform error.
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existingBlockList)
    ? existingBlockList
    : existingBlockList
      ? [existingBlockList]
      : []),
  /[/\\]\.env\.supabase(?:\.[^/\\]+)?$/,
  /[/\\]functions[/\\]\.env(?:\.[^/\\]+)?$/,
];

const ALIASES = {
  'react-native-maps': '@teovilla/react-native-web-maps',
};

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // The alias will only be used when bundling for the web.
    return context.resolveRequest(
      context,
      ALIASES[moduleName] ?? moduleName,
      platform,
    );
  }
  // Ensure you call the default resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
