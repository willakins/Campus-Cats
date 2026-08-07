import { createContext, useContext } from 'react';

import { ClubAccess } from '@/core/domain';

export interface ClubContextValue {
  readonly access: ClubAccess | undefined;
  readonly loading: boolean;
  readonly error: string | undefined;
}

export const ClubContext = createContext<ClubContextValue>({
  access: undefined,
  loading: false,
  error: undefined,
});

export const useClub = (): ClubContextValue => useContext(ClubContext);
