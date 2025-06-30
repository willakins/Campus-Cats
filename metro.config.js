const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

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
