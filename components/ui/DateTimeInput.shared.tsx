import { useState } from 'react';
import { Pressable, View } from 'react-native';

import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';

import { useAppTheme } from '@/theme';
import { AppText } from '../design';

type DateTimeInputProps = {
  date: Date;
  maximumDate?: Date;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  setDate: (date: Date) => void;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  maximumDate,
  open,
  onOpenChange,
  setDate,
}) => {
  const theme = useAppTheme();
  const [internalOpen, setInternalOpen] = useState(false);
  const showPicker = open ?? internalOpen;
  const setShowPicker = (nextOpen: boolean) => {
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };
  const onValueChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate: Date,
  ) => {
    setShowPicker(false);
    setDate(selectedDate);
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Choose date, current date ${date.toDateString()}`}
        onPress={() => setShowPicker(true)}
        style={({ pressed }) => ({
          minHeight: theme.layout.minTouchTarget,
          justifyContent: 'center',
          paddingHorizontal: theme.spacing.sm,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radii.field,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <AppText>{date.toDateString()}</AppText>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          maximumDate={maximumDate}
          mode="date"
          display="default"
          onValueChange={onValueChange}
          onDismiss={() => setShowPicker(false)}
        />
      ) : null}
    </View>
  );
};
