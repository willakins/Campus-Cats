import { SafeAreaView, ScrollView, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

const ManageUsers = () => {
  const router = useRouter();
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const userList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
          email: doc.data().email,
        }));
        setUsers(userList);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, []);

  return (
    <SafeAreaView style={containerStyles.container}>
      <TouchableOpacity style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={24} color="black" />
      </TouchableOpacity>

      <Text style={textStyles.headline2}>Manage Users</Text>

      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        {users.map((user) => (
          <View key={user.id} style={containerStyles.entryContainer}>
            <Text style={textStyles.normalText}>Name: {user.name}</Text>
            <Text style={textStyles.normalText}>Email: {user.email}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};
export default ManageUsers;