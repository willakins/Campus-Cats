import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { appModules } from '@/composition/appModules';
import { DEFAULT_APP_SETTINGS } from '@/core/domain';
import {
  AppSettingsContext,
  AppSettingsContextValue,
} from './AppSettingsContext';

export { useAppSettings } from './AppSettingsContext';

export const AppSettingsProvider = ({ children }: { readonly children: ReactNode }) => {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);

  const refreshSettings = useCallback(async () => {
    const result = await appModules.appSettings.get();
    if (result.ok) setSettings(result.value);
  }, []);

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
