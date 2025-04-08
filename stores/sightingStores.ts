import { Sighting } from '@/types';

let selectedSighting: Sighting = Sighting.dummy;

export const setSelectedSighting = (sighting: Sighting) => {
  selectedSighting = sighting;
};

export const getSelectedSighting = () => selectedSighting;
