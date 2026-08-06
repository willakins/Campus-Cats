import { AppSettings } from '../domain';

export interface AppSettingsReader {
  getSettings(): Promise<AppSettings>;
}
