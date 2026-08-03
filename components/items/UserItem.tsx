import React from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '@/components/ui/Buttons';
import { appModules } from '@/composition/appModules';
import { User, canManageUser } from '@/core/domain';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

interface UserItemProps {
  readonly actor: User;
  readonly user: User;
  readonly onChanged: () => void;
}

export const UserItem: React.FC<UserItemProps> = ({ actor, user, onChanged }) => {
  const canManage = canManageUser(actor, user);
  const run = async (action: () => ReturnType<typeof appModules.users.promote>) => {
    const result = await action();
    if (result.ok) onChanged();
    else Alert.alert('Could not update user', result.error.message);
  };
  const confirmRemove = () =>
    Alert.alert('Block User', `Remove ${user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block User',
        style: 'destructive',
        onPress: () =>
          void appModules.users.remove(actor, user.id).then((result) => {
            if (result.ok) onChanged();
            else Alert.alert('Could not remove user', result.error.message);
          }),
      },
    ]);

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.listTitle, { textAlign: 'center' }]}>
        {user.email}
      </Text>
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>Role: {user.role}</Text>
      {canManage ? (
        <View style={containerStyles.buttonGroup2}>
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'red' }]}
            onPress={confirmRemove}
          >
            <Text style={textStyles.smallButtonText}>Block User</Text>
          </Button>
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'green' }]}
            onPress={() => void run(() => appModules.users.promote(actor, user.id))}
          >
            <Text style={textStyles.smallButtonText}>Promote User</Text>
          </Button>
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'blue' }]}
            onPress={() => void run(() => appModules.users.demote(actor, user.id))}
          >
            <Text style={textStyles.smallButtonText}>Demote User</Text>
          </Button>
        </View>
      ) : null}
    </View>
  );
};
