import React, { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { useRouter } from 'expo-router';
import { Button } from '../ui/Buttons';
import { User } from '@/types';
import DatabaseService from '../services/DatabaseService';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { useAuth } from '@/providers';

export const UserItem: React.FC<{ user: User; setUsers: React.Dispatch<React.SetStateAction<User[]>> }> = ({ user, setUsers }) => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const { signOut, user: currentUser } = useAuth();
  const isHigher = currentUser.role == 2 || currentUser.role > user.role;

  const handleUserUpdate = async (action: () => Promise<void>) => {
    await action();
    database.fetchUsers(setUsers);
  };

  return (
    <View style={containerStyles.userContainer}>
      <Text style={textStyles.catalogTitle}>{user.email}</Text>
      <Text style={textStyles.catalogDescription}>Role: {user.role}</Text>
      <View style={containerStyles.entryRowElements}>
        {isHigher ? (
          <Button style={buttonStyles.deleteButton} onPress={() => handleUserUpdate(() => database.handleDeleteUser(user))}>
            <Text style={textStyles.deleteButtonText}>Block User</Text>
          </Button>
        ) : null}
        {isHigher ? (
          <Button style={buttonStyles.deleteButton2} onPress={() => handleUserUpdate(() => database.handlePromoteUser(user))}>
            <Text style={textStyles.deleteButtonText}>Promote User</Text>
          </Button>
        ) : null}
        {isHigher ? (
          <Button style={buttonStyles.deleteButton3} onPress={() => handleUserUpdate(() => database.handleDemoteUser(user))}>
            <Text style={textStyles.deleteButtonText}>Demote User</Text>
          </Button>
        ) : null}
      </View>
    </View>
  );
};