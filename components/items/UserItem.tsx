import React from 'react';
import { Text, View } from 'react-native';

import DatabaseService from '../../services/DatabaseService';
import { Button } from '../ui/Buttons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';
import { User } from '@/types';

export const UserItem: React.FC<{
  user: User;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
}> = ({ user, setUsers }) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { user: currentUser } = useAuth();
  const isHigher = currentUser.role === 2 || currentUser.role > user.role;

  const handleUserUpdate = async (action: () => Promise<void>) => {
    await action();
    database.fetchUsers(setUsers, currentUser.id);
  };

  return (
    <View style={containerStyles.card}>
      <Text style={[textStyles.listTitle, { textAlign: 'center' }]}>
        {user.email}
      </Text>
      <Text style={[textStyles.detail, { alignSelf: 'center' }]}>
        Role: {user.role}
      </Text>
      <View style={containerStyles.buttonGroup2}>
        {currentUser.role > user.role ? (
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'red' }]}
            onPress={() =>
              handleUserUpdate(() => database.handleDeleteUser(user, router))
            }
          >
            <Text style={textStyles.smallButtonText}>Block User</Text>
          </Button>
        ) : null}
        {isHigher ? (
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'green' }]}
            onPress={() =>
              handleUserUpdate(() => database.handlePromoteUser(user))
            }
          >
            <Text style={textStyles.smallButtonText}>Promote User</Text>
          </Button>
        ) : null}
        {isHigher ? (
          <Button
            style={[buttonStyles.rowButton, { backgroundColor: 'blue' }]}
            onPress={() =>
              handleUserUpdate(() => database.handleDemoteUser(user))
            }
          >
            <Text style={textStyles.smallButtonText}>Demote User</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
};
