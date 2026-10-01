import { createContext, useContext } from 'react';

import { AppSettings, DEFAULT_APP_SETTINGS } from '@/core/domain';

export interface AppSettingsContextValue {
  readonly settings: AppSettings;
  readonly applySettings: (settings: AppSettings) => void;
  readonly refreshSettings: () => Promise<void>;
}

export const AppSettingsContext = createContext<AppSettingsContextValue>({
  settings: DEFAULT_APP_SETTINGS,
  applySettings: () => undefined,
  refreshSettings: async () => undefined,
});

export const useAppSettings = (): AppSettingsContextValue =>
  useContext(AppSettingsContext);
