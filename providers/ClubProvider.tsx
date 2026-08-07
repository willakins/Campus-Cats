import { ReactNode, useEffect, useMemo, useState } from 'react';

import { appModules } from '@/composition/appModules';
import { ClubAccess } from '@/core/domain';
import { ClubContext, ClubContextValue } from './ClubContext';
import { useAuth } from './AuthProvider';

export { useClub } from './ClubContext';

export const ClubProvider = ({ children }: { readonly children: ReactNode }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<ClubAccess>();
  const [loading, setLoading] = useState(Boolean(currentUser));
  const [error, setError] = useState<string>();

  useEffect(() => {
    setAccess(undefined);
    setError(undefined);
    if (!currentUser) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    return appModules.clubBilling.observeAccess(
      currentUser,
      (next) => {
        setAccess(next);
        setLoading(false);
        if (!next) setError('Your club setup could not be found.');
      },
      () => {
        setError('Could not load your club subscription.');
        setLoading(false);
      },
    );
  }, [currentUser?.id, currentUser?.clubId]);

  const value = useMemo<ClubContextValue>(
    () => ({
      access,
      loading: authLoading || loading,
      error,
    }),
    [access, authLoading, error, loading],
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};
