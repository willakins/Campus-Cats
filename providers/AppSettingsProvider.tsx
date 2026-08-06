import {
  ReactNode,
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { appModules } from '@/composition/appModules';
import { AppSettings, DEFAULT_APP_SETTINGS } from '@/core/domain';

interface AppSettingsContextValue {
  readonly settings: AppSettings;
  readonly applySettings: (settings: AppSettings) => void;
  readonly refreshSettings: () => Promise<void>;
}

const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULT_APP_SETTINGS,
  applySettings: () => undefined,
  refreshSettings: async () => undefined,
});

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

export const useAppSettings = (): AppSettingsContextValue =>
  useContext(AppSettingsContext);
