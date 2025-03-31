import { FieldValues, useController } from 'react-hook-form';

import { TextInput } from '@/components';
import { TextInputProps } from '@/components/ui/TextInput';
import { InputControllerType } from '@/types';

type ControlledInputProps<T extends FieldValues> = TextInputProps & InputControllerType<T>;

const ControlledInput = <T extends FieldValues>({
  control,
  name,
  rules,
  ...props
}: ControlledInputProps<T>) => {
  const { field, fieldState } = useController({ control, name, rules });
  return (
    <TextInput
      onChangeText={field.onChange}
      value={field.value || ''}
      {...props}
      error={fieldState.error?.message}
    />
  );
};

export { ControlledInput };
