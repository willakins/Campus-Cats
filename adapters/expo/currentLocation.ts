import * as Location from 'expo-location';
import type { Coordinates } from '@/core/domain';

export const getCurrentCoordinates = async (): Promise<Coordinates> => {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Location access is disabled. Enable it in settings or choose a location on the map.',
    );
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};
