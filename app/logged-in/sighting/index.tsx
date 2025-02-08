import React, { useState } from "react";
import { View, Text, TextInput, Image, Switch, Button } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

const CatSightingScreen = ({ isEditable }) => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cat = JSON.parse(params.cat);

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

const ViewCatSighting = () => <CatSightingScreen isEditable={false} />;
const EditCatSighting = () => <CatSightingScreen isEditable={true} />;

export { ViewCatSighting, EditCatSighting };