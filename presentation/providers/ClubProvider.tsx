import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { appModules } from '@/composition/appModules';
import { ClubAccess } from '@/core/domain';
import { useAuth } from './AuthProvider';

export interface ClubContextValue {
  readonly access: ClubAccess | undefined;
  readonly loading: boolean;
  readonly error: string | undefined;
}

const ClubContext = createContext<ClubContextValue>({
  access: undefined,
  loading: false,
  error: undefined,
});

export const useClub = (): ClubContextValue => useContext(ClubContext);

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
