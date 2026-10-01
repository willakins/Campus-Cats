import React from 'react';

import { StartupSkeleton } from './Loading';

export const LoadingIndicator = ({ label = 'Getting things ready…' }: { label?: string }) => {
  return <StartupSkeleton label={label} />;
};
