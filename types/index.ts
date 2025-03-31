import { Control, FieldValues, Path, RegisterOptions } from 'react-hook-form';

// useState setter function type
export type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

// React hook form types
type TRule<T extends FieldValues> = Omit<
  RegisterOptions<T>,
  'disabled' | 'valueAsNumber' | 'valueAsDate' | 'setValueAs'
> | undefined;
export type RuleType<T extends FieldValues> = { [name in keyof T]: TRule<T> };

export type InputControllerType<T extends FieldValues> = {
  name: Path<T>;
  control: Control<T>;
  rules?: RuleType<T>;
};

// File exports
export { CatalogEntryObject } from './CatalogEntryObject';
export { AnnouncementEntryObject } from './AnnouncementEntryObject';
export { CatSightingObject } from './CatSightingObject';
export { StationEntryObject } from './StationEntryObject';
export { ContactInfo } from './ContactInfo';
export { User } from './User';
