import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  UniversitySelection,
  parseUniversitySelection,
} from '../../core/domain';
import { UniversitySelectionStore } from '../../core/ports';
import { FirebaseTenantScope } from '../firebase/FirebaseTenantScope';

const STORAGE_KEY = 'campus-cats:university-selection';

export class AsyncStorageUniversitySelection implements UniversitySelectionStore {
  constructor(private readonly tenantScope?: FirebaseTenantScope) {}

  async load(): Promise<UniversitySelection | undefined> {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      this.tenantScope?.clearSelectedClub();
      return undefined;
    }
    try {
      const selection = parseUniversitySelection(JSON.parse(stored));
      this.applyScope(selection);
      return selection;
    } catch {
      await AsyncStorage.removeItem(STORAGE_KEY);
      this.tenantScope?.clearSelectedClub();
      return undefined;
    }
  }

  async save(selection: UniversitySelection): Promise<void> {
    const parsed = parseUniversitySelection(selection);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    this.applyScope(parsed);
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    this.tenantScope?.clearSelectedClub();
  }

  private applyScope(selection: UniversitySelection): void {
    if (selection.clubId) this.tenantScope?.setSelectedClub(selection.clubId);
    else this.tenantScope?.clearSelectedClub();
  }
}
