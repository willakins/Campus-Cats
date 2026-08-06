import { Camera } from 'react-native-maps';

import { Coordinates } from '../core/domain';

export const GEORGIA_TECH_CENTER: Coordinates = {
  latitude: 33.776077,
  longitude: -84.396199,
};

export const createCampusCamera = (
  center: Coordinates = GEORGIA_TECH_CENTER,
): Camera => ({
  center,
  heading: 0,
  pitch: 0,
  altitude: 1000,
  zoom: 16,
});
