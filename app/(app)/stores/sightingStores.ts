// stores/sightingStore.ts
import { Sighting } from '@/types';

let selectedSighting: Sighting | null = null;

export const setSelectedSighting = (sighting: Sighting) => {
  selectedSighting = sighting;
};

export const getSelectedSighting = () => selectedSighting;
