import { FieldValues, useController } from 'react-hook-form';

import { DateTimeInput, ErrorText } from '@/components';
import { InputControllerType } from '@/types';

const ControlledDateTimeInput = <T extends FieldValues>({
  control,
  name,
  rules,
}: InputControllerType<T>) => {
  const { field, fieldState } = useController({ control, name, rules });
  return (
    <>
      <DateTimeInput
        date={field.value || new Date()}
        setDate={field.onChange}
      />
      <ErrorText error={fieldState.error?.message} />
    </>
  );
};

export { ControlledDateTimeInput };
