import { FieldValues, RegisterOptions } from 'react-hook-form';

// useState setter function type
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

// React hook form types
type TRule<T extends FieldValues> = Omit<
  RegisterOptions<T>,
  'disabled' | 'valueAsNumber' | 'valueAsDate' | 'setValueAs'
> | undefined;
export type RuleType<T extends FieldValues> = { [name in keyof T]: TRule<T> };

// File exports
export { CatalogEntryObject } from './CatalogEntryObject';
export { CatSightingObject } from './CatSightingObject';