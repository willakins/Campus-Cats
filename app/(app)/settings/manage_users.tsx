import { SafeAreaView, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button, UserItem } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import { User } from '@/types';
import { useAuth } from '@/providers';

const ManageUsers = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    if (user?.id) {
      database.fetchUsers(setUsers, user.id);
    }
  }, [user?.id]);
  

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <Text style={textStyles.title}>Manage Users</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {users.map((user) => (
          <UserItem key={user.id} user={user} setUsers={setUsers} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageUsers;
