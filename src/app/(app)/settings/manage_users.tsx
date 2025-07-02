import { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, Text } from 'react-native';

import { BackButton, UserItem } from '@/components';
import { useAuth } from '@/providers';
import DatabaseService from '@/services/DatabaseService';
import { containerStyles, textStyles } from '@/styles';
import { User } from '@/types';

const ManageUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    if (user?.id) {
      void database.fetchUsers(setUsers, user.id);
    }
    // NOTE: database is a singleton class provided by DatabaseService and
    // will never change; it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <BackButton />

      <Text style={textStyles.pageTitle}>Manage Users</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {users.map((u) => (
          <UserItem key={u.id} user={u} setUsers={setUsers} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageUsers;
