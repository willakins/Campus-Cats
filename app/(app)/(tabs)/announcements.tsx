import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Text, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from '@/services/firebase';

const Announcements = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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
      <Text>Announcements Screen</Text>
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
};

export default Announcements;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockIcon: {
    marginRight: 15, // Adjust as needed for positioning
  },
});
