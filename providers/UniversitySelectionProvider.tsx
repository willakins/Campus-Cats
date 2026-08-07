import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { appModules } from '@/composition/appModules';
import {
  ClubSetupVerification,
  Outcome,
  UniversitySearchResult,
  UniversitySelection,
  failure,
} from '@/core/domain';
import {
  UniversitySelectionContext,
  UniversitySelectionContextValue,
} from './UniversitySelectionContext';

export { useUniversitySelection } from './UniversitySelectionContext';

export const UniversitySelectionProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [selection, setSelection] = useState<UniversitySelection>();
  const [university, setUniversity] = useState<UniversitySearchResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refreshUniversity = useCallback(async () => {
    const restored = await appModules.universityOnboarding.restoreSelection();
    if (!restored.ok) {
      setError(restored.error.message);
      return undefined;
    }
    setSelection(restored.value);
    if (!restored.value) {
      setUniversity(undefined);
      return undefined;
    }
    const result = await appModules.universityOnboarding.get(
      restored.value.universityId,
    );
    if (!result.ok) {
      if (result.error.code === 'not_found') {
        await appModules.universityOnboarding.clearSelection();
        setSelection(undefined);
        setUniversity(undefined);
        setError(undefined);
        return undefined;
      }
      setError(result.error.message);
      return undefined;
    }
    const saved = await appModules.universityOnboarding.select(result.value);
    if (!saved.ok) {
      setError(saved.error.message);
      return undefined;
    }
    setSelection(saved.value);
    setUniversity(result.value);
    setError(undefined);
    return result.value;
  }, []);

  useEffect(() => {
    let mounted = true;
    void refreshUniversity().finally(() => {
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [refreshUniversity]);

  const selectUniversity = useCallback(
    async (next: UniversitySearchResult): Promise<Outcome<UniversitySelection>> => {
      const result = await appModules.universityOnboarding.select(next);
      if (result.ok) {
        setSelection(result.value);
        setUniversity(next);
        setError(undefined);
      } else setError(result.error.message);
      return result;
    },
    [],
  );

  const clearUniversity = useCallback(async () => {
    const result = await appModules.universityOnboarding.clearSelection();
    if (!result.ok) throw new Error(result.error.message);
    setSelection(undefined);
    setUniversity(undefined);
    setError(undefined);
  }, []);

  const verifySetup = useCallback(
    async (
      requestId: string,
      token: string,
    ): Promise<Outcome<ClubSetupVerification>> => {
      const result = await appModules.universityOnboarding.verifySetup(
        requestId,
        token,
      );
      if (!result.ok) {
        setError(result.error.message);
        return result;
      }
      const selected = await appModules.universityOnboarding.restoreSelection();
      if (!selected.ok || !selected.value) {
        return failure(
          'dependency_failure',
          selected.ok ? 'Could not restore the university selection' : selected.error.message,
        );
      }
      setSelection(selected.value);
      setUniversity(result.value.university);
      setError(undefined);
      return result;
    },
    [],
  );

  const value = useMemo<UniversitySelectionContextValue>(
    () => ({
      selection,
      university,
      loading,
      error,
      selectUniversity,
      refreshUniversity,
      clearUniversity,
      verifySetup,
    }),
    [
      clearUniversity,
      error,
      loading,
      refreshUniversity,
      selectUniversity,
      selection,
      university,
      verifySetup,
    ],
  );

  return (
    <UniversitySelectionContext.Provider value={value}>
      {children}
    </UniversitySelectionContext.Provider>
  );
};
