import { useState } from 'react';

import { FormField } from '@/presentation/ui';

import { DateTimeInput } from './DateTimeInput';

export const DateField = ({
  label,
  date,
  maximumDate,
  error,
  onChange,
}: {
  readonly label: string;
  readonly date: Date;
  readonly maximumDate?: Date;
  readonly error?: string;
  readonly onChange: (date: Date) => void;
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <FormField
      label={label}
      required
      error={error}
      onLabelPress={() => setPickerOpen((current) => !current)}
    >
      <DateTimeInput
        date={date}
        maximumDate={maximumDate}
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        setDate={onChange}
      />
    </FormField>
  );
};
