import { useCallback, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button, UserItem } from '@/components';
import { appModules } from '@/composition/appModules';
import { User, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const ManageUsers = () => {
  const router = useRouter();
  const { user } = useAuth();
  const actor = parseUser(user);
  const [users, setUsers] = useState<readonly User[]>([]);

  const load = useCallback(() => {
    void appModules.users.list(actor).then((result) => {
      if (result.ok) setUsers(result.value);
      else Alert.alert('Could not load users', result.error.message);
    });
  }, [actor.id]);
  useFocusEffect(load);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <Text style={textStyles.pageTitle}>Manage Users</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {users.map((managedUser) => (
          <UserItem
            key={managedUser.id}
            actor={actor}
            user={managedUser}
            onChanged={load}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageUsers;
