import React from 'react';

import { appMapAdapter } from '../../composition/mapAdapter';
import { AppMapViewProps } from '../maps/MapAdapter';

export type MapViewProps = AppMapViewProps;

export const MapView: React.FC<MapViewProps> = (props) => {
  const AdapterView = appMapAdapter.View;
  return <AdapterView {...props} />;
};
