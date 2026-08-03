import { Control, FieldValues, Path, RegisterOptions } from 'react-hook-form';

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
export { PickerConfig } from './PickerConfig';
