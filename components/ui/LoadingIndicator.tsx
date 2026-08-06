import React from 'react';

import { StartupSkeleton } from '../design';

export const LoadingIndicator = ({ label = 'Getting things ready…' }: { label?: string }) => {
  return <StartupSkeleton label={label} />;
};
