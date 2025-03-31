import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { containerStyles, textStyles } from '@/styles';
import { SetState } from '@/utils';

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
    <View style={containerStyles.dateInput}>
      <Text style={textStyles.sliderText}>
        {date ? date.toDateString() : 'Select Sighting Date'}
      </Text>
      <TouchableOpacity  onPress={() => setShowPicker(true)}>
        {showPicker ? <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onChange}/> : null}
      </TouchableOpacity>
      {error && <Text style={textStyles.errorText}>{error}</Text>}
    </View>
};
