import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { containerStyles } from '@/styles';

type ErrorbarProps = {
  error: string;
  onDismiss: () => void;
  duration?: number;
};

export const Errorbar: React.FC<ErrorbarProps> = ({
  error,
  onDismiss,
  duration = 3000,
}) => {
  const [visible, setVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (error && error.trim() !== '') {
      setMessage(error);
      setVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss();
  };

  return (
    <Portal>
      <View style={{ flex: 1, margin: 10 }}>
        <Snackbar
          visible={visible}
          onDismiss={handleDismiss}
          duration={duration}
          action={{
            label: 'Dismiss',
            onPress: handleDismiss,
          }}
        >
          {message}
        </Snackbar>
      </View>
    </Portal>
  );
};
