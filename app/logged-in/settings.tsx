import React, { useState, useEffect, useContext } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, TouchableOpacity} from 'react-native';
import { StyleSheet } from 'react-native';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/app/logged-in/firebase';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { AdminContext } from "../AdminContext";

const Settings = () => {
  const { adminStatus, setAdminStatus } = useContext(AdminContext);


    const router = useRouter();
    const handleLogout = () => {
      router.push('/login')
    };
    const handleCreateAdmins = () => {
      router.push('/settings/create_admins');
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
