import { useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button, SnackbarMessage, TextInput } from '@/components';
import { appModules } from '@/composition/appModules';
import { buttonStyles, containerStyles, textStyles } from '@/styles';

const Whitelist = () => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    graduationYear: '',
    email: '',
    codeWord: '',
  });
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };
  const submit = async () => {
    setVisible(true);
    const result = await appModules.whitelist.submit(formData);
    setVisible(false);
    if (!result.ok) {
      Alert.alert('Could not submit application', result.error.message);
      return;
    }
    Alert.alert(
      'Application submitted',
      'An officer will review it and email you if it is accepted.',
    );
    router.replace('/login');
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => router.back()}>
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
            />
          </View>
        </View>
      </ScrollView>
      <Button style={buttonStyles.bigButton} onPress={() => void submit()}>
        <Text style={textStyles.bigButtonText}>Submit Application</Text>
      </Button>
    </SafeAreaView>
  );
};

export default Whitelist;
