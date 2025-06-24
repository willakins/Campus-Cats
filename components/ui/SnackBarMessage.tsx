import React from 'react';
import { View } from 'react-native';
import { Snackbar } from 'react-native-paper';

import { containerStyles } from '@/styles';

interface SnackbarMessageProps {
  text: string;
  visible: boolean;
  setVisible: (value: boolean) => void;
}

export const SnackbarMessage: React.FC<SnackbarMessageProps> = ({
  text,
  visible,
  setVisible,
}) => {
  return (
    <View style={containerStyles.snackbarContainer}>
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={10000}
        style={containerStyles.snackbar}
      >
        {text}
      </Snackbar>
    </View>
  );
};
