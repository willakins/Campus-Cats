import React, { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { StyleSheet } from 'react-native';

import { auth, db } from '@/services/firebase';
import { useAuth } from '@/providers';

const Settings = () => {
  const { signOut } = useAuth();
  const [adminStatus, setAdminStatus] = useState<boolean>(false); 
  const router = useRouter();

  const handleLogout = () => {
    signOut();
    router.push('/login')
  };
  const handleCreateAdmins = () => {
    router.push('/settings/create_admins');
  };

  // Following function checks for admin status
  useEffect(() => {
    setUserRole();
  }, []);
  const setUserRole = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userRole = userDoc.data().role;
        setAdminStatus(userRole === 1 || userRole === 2);
      } else {
        console.log('No user document found!');
      }
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={25} color="#fff" />
      </TouchableOpacity>
      <Text>Setting Screen</Text>
      {adminStatus && (<>
        <TouchableOpacity style={styles.button} onPress={handleCreateAdmins}>
          <Text style={styles.buttonText}>Make someone else an admin</Text>
        </TouchableOpacity>
        <Ionicons
          name="lock-closed"
          size={24}
          color="black"
          style={styles.lockIcon}
        />
      </>)}
    </View>
  );
}

export default Settings;

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
});
