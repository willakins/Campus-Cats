import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, Switch, Button, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../logged-in/firebase";

const CatSightingScreen = () => {
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
  const router = useRouter();
  const params = useLocalSearchParams();
  const edit = params.isEditable;
  var isEditable:boolean = false;
  if (edit === "true") {
    var isEditable = true;
  } else {
    var isEditable = false;
  }
  const cat = JSON.parse(params.cat as string);

  const [name, setName] = useState(cat.name);
  const [info, setInfo] = useState(cat.info);
  const [health, setHealth] = useState(cat.health);
  const [fed, setFed] = useState(cat.fed);

  return (
    <View style={{ padding: 20 }}>
      <Image source={{ uri: cat.image }} style={{ width: "100%", height: 200, borderRadius: 10 }} />
      <Text>Name:</Text>
      <TextInput value={name} onChangeText={setName} editable={isEditable} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
      <Text>Additional Info:</Text>
      <TextInput value={info} onChangeText={setInfo} editable={isEditable} style={{ borderBottomWidth: 1, marginBottom: 10 }} />
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text>Healthy:</Text>
        <Switch value={health} onValueChange={setHealth} disabled={!isEditable} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Text>Fed:</Text>
        <Switch value={fed} onValueChange={setFed} disabled={!isEditable} />
      </View>
      {isEditable && <Button title="Save" onPress={() => alert("Saved!")} />}
      <Button title="Back" onPress={() => router.back()} />
    </View>
  );
};


export default CatSightingScreen;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});