import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { appModules } from '@/composition/appModules';
import { DEFAULT_APP_SETTINGS } from '@/core/domain';
import { useAuth } from './AuthProvider';
import { useUniversitySelection } from './UniversitySelectionProvider';
import {
  AppSettingsContext,
  AppSettingsContextValue,
} from './AppSettingsContext';

export { useAppSettings } from './AppSettingsContext';

export const AppSettingsProvider = ({ children }: { readonly children: ReactNode }) => {
  const { currentUser } = useAuth();
  const { university } = useUniversitySelection();
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  const refreshSettings = useCallback(async () => {
    if (!currentUser && !university?.club) {
      setSettings(DEFAULT_APP_SETTINGS);
      return;
    }
    const result = await appModules.appSettings.get();
    if (result.ok) setSettings(result.value);
  }, [currentUser?.clubId, university?.club?.id]);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  const value = useMemo<AppSettingsContextValue>(
    () => ({ settings, applySettings: setSettings, refreshSettings }),
    [refreshSettings, settings],
  );

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
};
