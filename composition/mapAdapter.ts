import { createReactNativeMapsAdapter } from '../adapters/maps/reactNativeMaps/createReactNativeMapsAdapter';

// Map-provider selection lives here. Replacing the map implementation changes
// this module, not screens, forms, or domain code.
export const appMapAdapter = createReactNativeMapsAdapter({
  webGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
});
