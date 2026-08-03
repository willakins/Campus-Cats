import React from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Buttons';
import { appModules } from '@/composition/appModules';
import { User, WhitelistApplication } from '@/core/domain';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

interface WhitelistItemProps {
  readonly actor: User;
  readonly application: WhitelistApplication;
  readonly onChanged: () => void;
  readonly setBusy: (busy: boolean) => void;
}

export const WhitelistItem: React.FC<WhitelistItemProps> = ({
  actor,
  application,
  onChanged,
  setBusy,
}) => {
  const decide = async (decision: 'accept' | 'deny') => {
    setBusy(true);
    const result =
      decision === 'accept'
        ? await appModules.whitelist.accept(actor, application.id)
        : await appModules.whitelist.deny(actor, application.id);
    setBusy(false);
    if (result.ok) onChanged();
    else Alert.alert('Could not update application', result.error.message);
  };

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.listTitle, { marginTop: 0 }]}>
        {application.name}
      </Text>
      <Text style={textStyles.detail}>Code Word: {application.codeWord}</Text>
      <Text style={textStyles.detail}>
        Graduation Year: {application.graduationYear}
      </Text>
      <View style={containerStyles.buttonGroup2}>
        <Button
          style={[buttonStyles.rowButton, { backgroundColor: 'red' }]}
          onPress={() => void decide('deny')}
        >
          <Text style={textStyles.smallButtonText}>Deny</Text>
        </Button>
        <Button
          style={[buttonStyles.rowButton, { backgroundColor: 'green' }]}
          onPress={() => void decide('accept')}
        >
          <Text style={textStyles.smallButtonText}>Accept</Text>
        </Button>
      </View>
    </View>
  );
};
