import { FieldValues, useController } from 'react-hook-form';

import { ErrorText, Switch } from '@/components';
import { SwitchProps } from '@/components/ui/Switch';
import { InputControllerType } from '@/types';

type ControlledSwitchProps<T extends FieldValues> = SwitchProps &
  InputControllerType<T>;

const ControlledSwitch = <T extends FieldValues>({
  control,
  name,
  rules,
  ...props
}: ControlledSwitchProps<T>) => {
  const { field, fieldState } = useController({ control, name, rules });
  // TODO: Consider using hookform ErrorMessage for errors
  return (
    <>
      <Switch
        onValueChange={field.onChange}
        value={field.value || false}
        {...props}
      />
      <ErrorText error={fieldState.error?.message} />
    </>
  );
};

export { ControlledSwitch };
