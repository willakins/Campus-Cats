import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SetState } from '@/utils';

type DateTimeInputProps = {
  date: Date;
  setDate: SetState<Date>;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  setDate,
}) => {
  const [show, setShow] = useState(false);

  const onChange = (event: DateTimePickerEvent, selectedDate: Date| undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
    }
    setShow(false);
  };

  return (
    <View style={styles.dateInput}>
      <TouchableOpacity onPress={() => setShow(true)}>
        <Text style={styles.dateInputText}>
          {date ? date.toDateString() : 'Select Sighting Date'}
        </Text>
        {show ? <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="default"
          onChange={onChange}/> : null}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateInput: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  dateInputText: {
    color: 'black',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'left',
    padding: 10,
  },
});


