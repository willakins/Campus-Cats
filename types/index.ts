import { Control, FieldValues, Path, RegisterOptions } from 'react-hook-form';
import { z } from 'zod';

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

export const LatLngSchema = z.object({
  latitude: z.number()
    .min(-90, "Latitude must be between -90 and 90 degrees")
    .max(90, "Latitude must be between -90 and 90 degrees"),
  longitude: z.number()
    .min(-180, "Longitude must be between -180 and 180 degrees")
    .max(180, "Longitude must be between -180 and 180 degrees"),
});

// File exports
export { CatalogEntryObject } from './CatalogEntryObject';
export { AnnouncementEntryObject } from './AnnouncementEntryObject';
export { CatSightingObject } from './CatSightingObject';
export { StationEntryObject } from './StationEntryObject';
export { WhitelistApp } from './WhitelistApp';
export { ContactInfo } from './ContactInfo';
export { User } from './User';
export { firestoreDocRefSchema } from './firestore';
