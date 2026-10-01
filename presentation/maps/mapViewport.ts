import { Coordinates } from '@/core/domain';
import { MapViewport } from './MapAdapter';

export const GEORGIA_TECH_CENTER: Coordinates = {
  latitude: 33.776077,
  longitude: -84.396199,
};

export const createCampusViewport = (
  center: Coordinates = GEORGIA_TECH_CENTER,
): MapViewport => ({
  center,
  zoom: 16,
});

export const createCampusOverviewViewport = (): MapViewport => ({
  center: GEORGIA_TECH_CENTER,
  zoom: 14,
});
