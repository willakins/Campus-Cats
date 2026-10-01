import React from 'react';

import { appMapAdapter } from '@/composition/mapAdapter';
import { AppMapPathProps } from './MapAdapter';

export const MapPath = (props: AppMapPathProps) => {
  const AdapterPath = appMapAdapter.Path;
  return <AdapterPath {...props} />;
};
