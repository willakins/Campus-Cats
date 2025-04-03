import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { containerStyles, textStyles } from '@/styles';
import { SetState } from '@/utils';
import { ErrorText } from './ErrorText';

type DateTimeInputProps = {
  date: Date;
  setDate: SetState<Date>;
  error?: string;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  setDate,
  error,
}) => {
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const onChange = (event: DateTimePickerEvent, selectedDate: Date| undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShowPicker(false);
  };

  return (
    <TouchableOpacity onPress={() => setShowPicker(true)}>
      <View style={containerStyles.dateInput}>
        <Text style={textStyles.sliderText}>
          {date ? date.toDateString() : 'Select Sighting Date'}
        </Text>
        {showPicker ? <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onChange}/> : null}
        <ErrorText error={error} />
      </View>
    </TouchableOpacity>
  );
};
