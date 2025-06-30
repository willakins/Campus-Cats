import { Station } from '@/types';

let selectedStation: Station = Station.dummy;

export const setSelectedStation = (station: Station) => {
  selectedStation = station;
};

export const getSelectedStation = () => selectedStation;
