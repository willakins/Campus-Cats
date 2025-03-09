import { useState } from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';

import { DateTimePickerAndroid, DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { SetState } from '@/types';

type AndroidMode = 'date' | 'time';

type DateTimeInputProps = {
  date: Date;
  setDate: SetState<Date | undefined>;
};

export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  date,
  setDate,
}) => {
  const onChange = (event: DateTimePickerEvent, selectedDate: Date | undefined) => {
    const currentDate = selectedDate;
    setDate(currentDate);
  };

  const showMode = (currentMode: AndroidMode) => {
    DateTimePickerAndroid.open({
      value: date,
      onChange,
      mode: currentMode,
      is24Hour: false,
    });
  };

  const showDatepicker = () => {
    showMode('date');
  };

  const showTimepicker = () => {
    showMode('time');
  };

  return (
    <>
      <TouchableOpacity onPress={showDatepicker}>
        <View style={styles.dateInput}>
          <Text style={styles.dateInputText}>
            {date.toLocaleDateString([], {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={showTimepicker}>
        <View style={styles.dateInput}>
          <Text style={styles.dateInputText}>
            {date.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    </>
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


