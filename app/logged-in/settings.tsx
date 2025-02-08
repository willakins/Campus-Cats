import React, { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, ActivityIndicator, TouchableOpacity} from 'react-native';
import { StyleSheet } from 'react-native';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';

const Settings = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");

  // Fetch current logged-in user ID on mount
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      setUserId(user.uid);  // Store user ID in state
    } else {
      setMessage("No user is logged in.");
    }
  }, []);

  // Handle updating the document
  const handleUpdateField = async () => {
    if (userId) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', userId); // Reference to the user's document

      try {
        // Update the field in the user's document
        await updateDoc(userDocRef, {
          Admin: true,  // Replace with the field you want to update
        });

        alert("You are now an admin!");
        setIsAdmin(true)
      } catch (error) {
        setMessage("Error updating field: " + error);
      }
    } else {
      setMessage("No user is logged in.");
    }
  };

    const router = useRouter();
    const handleLogout = () => {
      router.push('/login')
    };
    useEffect(() => {
        const checkUserRole = async () => {
        try {
            // Get current user ID
            const user = auth.currentUser;
            if (!user) {
            console.error('User not logged in');
            setLoading(false);
            return;
            }

            // Fetch user role from Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
            const { role } = userDoc.data();
            setIsAdmin(role === 1 || role === 2); // Admin roles are 1 or 2
            } else {
            console.error('User document does not exist');
            }
        } catch (error) {
            console.error('Error fetching user role:', error);
        } finally {
            setLoading(false);
        }
    };

    checkUserRole();
  }, []);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={25} color="#fff" />
        </TouchableOpacity>
        <Text>Setting Screen</Text>
        <TouchableOpacity style={styles.button} onPress={handleUpdateField}>
          <Text style={styles.buttonText}>Make yourself an administrator</Text>
        </TouchableOpacity>
        {isAdmin ? (
                <Ionicons
                  name="lock-closed"
                  size={24}
                  color="black"
                  style={styles.lockIcon}
                />
              ) : null}
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