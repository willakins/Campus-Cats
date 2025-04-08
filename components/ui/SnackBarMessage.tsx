import React from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { containerStyles } from '@/styles';
import { View } from 'react-native';

interface SnackbarMessageProps {
  text: string;
  visible: boolean;
  setVisible: (value: boolean) => void;
}

export const SnackbarMessage: React.FC<SnackbarMessageProps> = ({ text, visible, setVisible }) => {
  return (
    <View style={containerStyles.snackbarContainer}>
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={2000}
        style={containerStyles.snackbar}
      >
        {text}
      </Snackbar>
    </View>
  );
};
