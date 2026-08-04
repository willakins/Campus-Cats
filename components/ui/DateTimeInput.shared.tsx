import { useState } from 'react';
import { Pressable, View } from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useAppTheme } from '@/theme';
import { AppText } from '../design';

type DateTimeInputProps = {
  date: Date;
  setDate: (date: Date) => void;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({ date, setDate }) => {
  const theme = useAppTheme();
  const [showPicker, setShowPicker] = useState(false);
  const onChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
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
          mode="date"
          display="default"
          onChange={onChange}
        />
      ) : null}
    </View>
  );
};
