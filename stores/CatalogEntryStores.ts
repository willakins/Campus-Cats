import { CatalogEntry } from '@/types';

let selectedCatalogEntry: CatalogEntry = CatalogEntry.dummy;

export const setSelectedCatalogEntry = (entry: CatalogEntry) => {
  selectedCatalogEntry = entry;
};

export const getSelectedCatalogEntry = () => selectedCatalogEntry;
