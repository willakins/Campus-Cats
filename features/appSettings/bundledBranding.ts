import { Asset } from 'expo-asset';

// This is the club artwork that was bundled as the native app icon before
// branding became database-managed. Keep it only as the one-time migration source.
const CURRENT_CLUB_LOGO_SOURCE = require('../../assets/images/icon.png');

export const loadBundledClubLogoUri = async (): Promise<string> => {
  const asset = await Asset.fromModule(CURRENT_CLUB_LOGO_SOURCE).downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) throw new Error('The bundled club logo could not be loaded');
  return uri;
};
