import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import { collection, doc, DocumentData, getDoc, getDocs, getFirestore, query, updateDoc, where } from 'firebase/firestore';

import { Button, TextInput } from '@/components';
import { auth, db } from '@/config/firebase';

const CreateAdmins = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selfId, setSelfId] = useState<string | null>(null);

  const handleBack = () => {
    // TODO: Retract a stack, instead of relying on absolute URL
    router.push('/settings');
  };

  // Fetch current logged-in user ID on mount
  useEffect(() => {
    const user = auth.currentUser;

    if (user) {
      setSelfId(user.uid);  // Store user ID in state
    } else {
      console.log('No user is logged in.');
    }
  }, []);

  const handleMakeAdmin = () => {
    const queryEmail = async (user_email: string) => {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', user_email));
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
          return selfData.data()?.role == 2;

        } catch (error) {
          Alert.alert('Error getting field: ' + error);
        }
      }
      return false;
    };

    const makeAdmin = async (user_email: string) => {
      if (!isSuperAdmin()) {
        Alert.alert('You do not have permissions to create admins');
        return;
      }

      const [userId, userData] = await queryEmail(user_email) as [string, DocumentData];;

      if (userId) {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', userId); // Reference to the user's document

        try {
          // Update the field in the user's document
          await updateDoc(userDocRef, {
            role: 1,
          });

          Alert.alert(userData.email + ' is now an admin!');
        } catch (error) {
          Alert.alert('Error updating field: ' + error);
        }
      } else {
        Alert.alert('No user is logged in.');
      }
    };

    makeAdmin(email);
  };

  return (
    <View style={styles.profileContainer}>
      <Button style={styles.logoutButton} onPress={handleBack}>
        Back
      </Button>

      <TextInput
        placeholder="User email"
        onChangeText={setEmail}
      />
      <Button onPress={handleMakeAdmin}>
        Make administrator
      </Button>
    </View>
  );
};

export default CreateAdmins;

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
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
  tabs: {
    flex: 1,
    justifyContent: 'flex-end',
    bottom: 0,
    backgroundColor: '#333',
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
});
