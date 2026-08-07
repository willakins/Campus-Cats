import { UniversitySelection, parseUniversitySelection } from '../../core/domain';
import { UniversitySelectionStore } from '../../core/ports';

export class InMemoryUniversitySelectionStore implements UniversitySelectionStore {
  #selection: UniversitySelection | undefined;

  async load(): Promise<UniversitySelection | undefined> {
    return this.#selection;
  }

  async save(selection: UniversitySelection): Promise<void> {
    this.#selection = parseUniversitySelection(selection);
  }

  async clear(): Promise<void> {
    this.#selection = undefined;
  }
}
