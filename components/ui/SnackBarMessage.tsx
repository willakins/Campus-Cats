import React from 'react';
import { Portal, Snackbar } from 'react-native-paper';
import { containerStyles } from '@/styles';

interface SnackbarMessageProps {
  text: string;
  visible: boolean;
  setVisible: (value: boolean) => void;
}

export const SnackbarMessage: React.FC<SnackbarMessageProps> = ({ text, visible, setVisible }) => {
  return (
    <Portal>
      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={2000}
        style={containerStyles.snackbar}
      >
        {text}
      </Snackbar>
    </Portal>
  );
};
