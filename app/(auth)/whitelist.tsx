import { useState } from 'react';
import { SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage, TextInput } from '@/components';
import DatabaseService from '@/services/DatabaseService';
import {
  buttonStyles,
  containerStyles,
  globalStyles,
  textStyles,
} from '@/styles';
import { WhitelistApp } from '@/types';

const Whitelist = () => {
  const router = useRouter();
  const database = DatabaseService.getInstance();
  const [visible, setVisible] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    graduationYear: '',
    email: '',
    codeWord: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const createObj = () => {
    return new WhitelistApp(
      formData.id,
      formData.name,
      formData.graduationYear,
      formData.email,
      formData.codeWord,
    );
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button
        style={buttonStyles.smallButtonTopLeft}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
      </Button>
      <SnackbarMessage
        text="Saving Application..."
        visible={visible}
        setVisible={setVisible}
      />
      <Text style={textStyles.lowerPageTitle}>Apply for non-GT account</Text>
      <ScrollView contentContainerStyle={containerStyles.scrollViewCenter}>
        <View style={containerStyles.card}>
          <Text style={textStyles.label}>Enter your full name</Text>
          <View style={containerStyles.inputContainer}>
            <TextInput
              value={formData.name}
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('name', text)}
              style={textStyles.input}
              multiline={false}
            />
          </View>

          <Text style={textStyles.label}>
            What year did you graduate Georgia Tech?
          </Text>
          <View style={containerStyles.inputContainer}>
            <TextInput
              value={formData.graduationYear}
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('graduationYear', text)}
              style={textStyles.input}
              multiline={false}
            />
          </View>

          <Text style={textStyles.label}>
            What email would you like to use to login?
          </Text>
          <View style={containerStyles.inputContainer}>
            <TextInput
              value={formData.email}
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('email', text)}
              style={textStyles.input}
              multiline={false}
            />
          </View>

          <Text style={textStyles.label}>
            Do you have a secret security word from an officer? (optional)
          </Text>
          <View style={containerStyles.inputContainer}>
            <TextInput
              value={formData.codeWord}
              placeholderTextColor="#888"
              onChangeText={(text) => handleChange('codeWord', text)}
              style={textStyles.input}
              multiline={false}
            />
          </View>
        </View>
      </ScrollView>
      <Button
        style={buttonStyles.bigButton}
        onPress={() =>
          database.submitWhitelist(createObj(), setVisible, router)
        }
      >
        <Text style={textStyles.bigButtonText}>Submit Application</Text>
      </Button>
    </SafeAreaView>
  );
};
export default Whitelist;
