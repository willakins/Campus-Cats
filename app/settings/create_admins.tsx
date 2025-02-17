import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/app/logged-in/firebase';
import { getAuth } from 'firebase/auth';

type ItemProps = {title: string};

const Item = ({title}: ItemProps) => (
  <View style={styles.item}>
    <Text style={styles.title}>{title}</Text>
  </View>
);
const CreateAdmins = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selfId, setSelfId] = useState<string | null>(null);

  const handleBack = () => {
    // TODO: Retract a stack, instead of relying on absolute URL
    router.push('/logged-in/settings');
  };

  // Fetch current logged-in user ID on mount
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      setSelfId(user.uid);  // Store user ID in state
    } else {
      console.log("No user is logged in.");
    }
  }, []);

  const handleMakeAdmin = () => {
    const queryEmail = async (user_email: string) => {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", user_email));
      const querySnapshot = await getDocs(q);
      return [querySnapshot.docs[0].id, querySnapshot.docs[0].data()];
    };

    const isSuperAdmin = async () => {
      if (selfId) {
        const db = getFirestore();
        const selfDocRef = doc(db, 'users', selfId); // Reference to the user's document

        try {
          // Update the field in the user's document
          const selfData = await getDoc(selfDocRef);
          return selfData.data().role == 2;

        } catch (error) {
          Alert.alert("Error getting field: " + error);
        }
      }
      return false;
    };

    const makeAdmin = async (user_email: string) => {
      if (!isSuperAdmin()) {
        Alert.alert("You do not have permissions to create admins");
        return;
      }

      const [userId, userData] = await queryEmail(email);

      if (userId) {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', userId); // Reference to the user's document

        try {
          // Update the field in the user's document
          await updateDoc(userDocRef, {
            role: 1,
          });

          Alert.alert(userData.email + " is now an admin!");
        } catch (error) {
          Alert.alert("Error updating field: " + error);
        }
      } else {
        Alert.alert("No user is logged in.");
      }
    };

    makeAdmin(email);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: '100' }}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>

      <TextInput 
        placeholder="User email"
        onChangeText={setEmail} 
        style={styles.input}
      />
      <TouchableOpacity style={styles.button} onPress={handleMakeAdmin}>
        { false && <Text> hi </Text> }
        <Text style={styles.buttonText}>Make administrator</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateAdmins;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 15, // Adjust as needed for positioning
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end', // Tab navigator will sit at the bottom
    marginTop: StatusBar.currentHeight || 0,
  },
  screenContainer: {
    flex: 1,
    top: -50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 5,
    borderRadius: 5,
    zIndex: 10, // Ensure the logout button is on top
  },
  logoutText: {
    color: '#fff',
    marginLeft: 5,
  },
  tabs: {
    flex: 1,
    justifyContent: 'flex-end',
    bottom: 0,
    backgroundColor: '#333',
  },
  button: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    margin: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',

  },
  item: {
    backgroundColor: '#f9c2ff',
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 32,
  },
  input: {
    height: 40,
    width: 300,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
  },
});
