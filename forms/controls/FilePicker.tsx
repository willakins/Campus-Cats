import { FieldValues, useController } from 'react-hook-form';

import { ErrorText, FilePicker } from '@/components';
import { InputControllerType } from '@/types';

const ControlledFilePicker = <T extends FieldValues>({
  control,
  name,
  rules,
}: InputControllerType<T>) => {
  const { field, fieldState } = useController({ control, name, rules });

  const handleChange = (uri: string) => {
    field.onChange([uri]);
  };

  return (
    <>
      <FilePicker
        uri={field.value ? field.value[0] : ''}
        onChange={handleChange}
      />
      <ErrorText error={fieldState.error?.message} />
    </>
  );
};

export { ControlledFilePicker };
