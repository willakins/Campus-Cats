import React from 'react';
import { Text, View } from 'react-native';

import { Button } from '../ui/Buttons';
import { WhitelistApp } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

export const WhitelistItem: React.FC<{ app: WhitelistApp; setApps: React.Dispatch<React.SetStateAction<WhitelistApp[]>>; setVisible: React.Dispatch<React.SetStateAction<boolean>> }> = 
({ app, setApps, setVisible }) => {
  const database = DatabaseService.getInstance();

  return (
    <View style={containerStyles.userContainer}>
      <Text style={textStyles.catalogTitle}>{app.name}</Text>
      <Text style={textStyles.catalogDescription}>Code Word: {app.codeWord}</Text>
      <Text style={textStyles.catalogDescription}>Graduation Year: {app.graduationYear}</Text>
      <View style={containerStyles.entryRowElements}>
        <Button style={buttonStyles.deleteButton} onPress={() => database.whitelistDecide(app, 'deny', setApps, setVisible)}>
        <Text style={textStyles.deleteButtonText}>Deny</Text>
        </Button>
        <Button style={buttonStyles.deleteButton2} onPress={() => database.whitelistDecide(app, 'accept', setApps, setVisible)}>
        <Text style={textStyles.deleteButtonText}>Accept</Text>
        </Button>
      </View>
    </View>
  );
};