import { SafeAreaView, ScrollView, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button } from '@/components';
import { UserItem } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { User } from '@/types';

const ManageWhitelist = () => {
  const router = useRouter();
  const [notGTusers, setnotGTUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const database = DatabaseService.getInstance();

  useEffect(() => {
    database.fetchUsers(setnotGTUsers);
  }, []);

  return (
    <SafeAreaView style={containerStyles.container}>
      <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>

      <Text style={textStyles.title}>View Non-GT users</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {notGTusers.map((user) => (
          <UserItem key={user.id} user={user} setUsers={setnotGTUsers} />
        ))}
        <Text style={textStyles.headline2}>Pending users</Text>
        {pendingUsers.map((user) => (
          <UserItem key={user.id} user={user} setUsers={setPendingUsers} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ManageWhitelist;
