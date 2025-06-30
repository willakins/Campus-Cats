import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { containerStyles, textStyles } from '@/styles';
import { SetState } from '@/utils';

type DateTimeInputProps = {
  date: Date;
  setDate: SetState<Date>;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  setDate,
}) => {
  const [showPicker, setShowPicker] = useState<boolean>(true);

  const onChange = (
    event: DateTimePickerEvent,
    selectedDate: Date | undefined,
  ) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShowPicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      setShowPicker(false);
      setTimeout(() => {
        setShowPicker(true);
      }, 10);
    }
  };

  return (
    <View style={containerStyles.dateInputContainer}>
      <Text style={textStyles.dateText}>{date.toDateString()}</Text>
      {showPicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onChange}
          style={containerStyles.datePickerContainer}
        />
      )}
    </View>
  );
};
