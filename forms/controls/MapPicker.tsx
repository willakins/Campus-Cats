import { FieldValues, useController } from 'react-hook-form';
import { MapViewProps } from 'react-native-maps';

import { ErrorText, MapPicker } from '@/components';
import { DefaultLocation } from '@/config/constants';
import { InputControllerType } from '@/types';

type ControlledMapPickerProps<T extends FieldValues> = MapViewProps &
  InputControllerType<T>;

const ControlledMapPicker = <T extends FieldValues>({
  control,
  name,
  rules,
  ...props
}: ControlledMapPickerProps<T>) => {
  const { field, fieldState } = useController({ control, name, rules });
  return (
    <>
      <MapPicker
        location={field.value || DefaultLocation}
        onChange={field.onChange}
        {...props}
      />
      <ErrorText error={fieldState.error?.message} />
    </>
  );
};

export { ControlledMapPicker };
