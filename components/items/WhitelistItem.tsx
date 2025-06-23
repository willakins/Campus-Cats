import React from 'react';
import { Text, View } from 'react-native';

import DatabaseService from '../../services/DatabaseService';
import { Button } from '../ui/Buttons';

import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { User, WhitelistApp } from '@/types';

export const WhitelistItem: React.FC<{
  app: WhitelistApp;
  setApps: React.Dispatch<React.SetStateAction<WhitelistApp[]>>;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ app, setApps, setVisible }) => {
  const database = DatabaseService.getInstance();

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.listTitle, { marginTop: 0 }]}>{app.name}</Text>
      <Text style={textStyles.detail}>Code Word: {app.codeWord}</Text>
      <Text style={textStyles.detail}>
        Graduation Year: {app.graduationYear}
      </Text>
      <View style={containerStyles.buttonGroup2}>
        <Button
          style={[buttonStyles.rowButton, { backgroundColor: 'red' }]}
          onPress={() =>
            database.whitelistDecide(app, 'deny', setApps, setVisible)
          }
        >
          <Text style={textStyles.smallButtonText}>Deny</Text>
        </Button>
        <Button
          style={[buttonStyles.rowButton, { backgroundColor: 'green' }]}
          onPress={() =>
            database.whitelistDecide(app, 'accept', setApps, setVisible)
          }
        >
          <Text style={textStyles.smallButtonText}>Accept</Text>
        </Button>
      </View>
    </View>
  );
};
