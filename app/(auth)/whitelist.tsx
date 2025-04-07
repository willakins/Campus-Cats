import { SafeAreaView, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';
import { Button, TextInput } from '@/components';
import DatabaseService from '@/components/services/DatabaseService';
import { WhitelistApp } from "@/types";
import { Snackbar } from 'react-native-paper';

const Whitelist = () => {
    const router = useRouter();
    const database = DatabaseService.getInstance();
    const [visible, setVisible] = useState<boolean>(false);
    const [formData, setFormData] = useState({id:"", name:"", graduationYear:"", email:"", codeWord:""});    

    const handleChange = (field: string, value: string) => {
    setFormData(prevData => ({
        ...prevData,
        [field]: value
    }));
    };

    const createObj = () => {
        return new WhitelistApp(formData.id, formData.name, formData.graduationYear, formData.email, formData.codeWord);
    }

    return (
    <SafeAreaView style={containerStyles.container}>
        <Button style={buttonStyles.logoutButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back-outline" size={25} color="#fff" />
        </Button>

        <Text style={textStyles.title}>Apply to be Whitelisted to The App</Text>
        <ScrollView contentContainerStyle={containerStyles.catalogEntryContainer}>
            <View style={containerStyles.catalogInputContainer}>
                <Text style={textStyles.headline}>Enter your full name</Text>
                    <TextInput
                    value={formData.name}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('name', text)} 
                    style={textStyles.catalogInput} 
                    multiline={false}/>
                <Text style={textStyles.headline}>What year did you graduate Georgia Tech?</Text>
                    <TextInput
                    value={formData.graduationYear}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('graduationYear', text)} 
                    style={textStyles.catalogInput} 
                    multiline={false}/>
                <Text style={textStyles.headline}>What email would you like to use to login?</Text>
                    <TextInput
                    value={formData.email}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('email', text)} 
                    style={textStyles.catalogInput} 
                    multiline={false}/>
                <Text style={textStyles.headline}>Do you have a secret security word from an officer? (optional)</Text>
                    <TextInput
                    value={formData.codeWord}
                    placeholderTextColor="#888"
                    onChangeText={(text) => handleChange('codeWord', text)} 
                    style={textStyles.catalogInput} 
                    multiline={false}/>
            </View>
        </ScrollView>
        <Button style={buttonStyles.button2} onPress={() => database.submitWhitelist(createObj(), setVisible, router)}>
            <Text style={textStyles.bigButtonText}>Submit Application</Text>
        </Button>
        <Snackbar visible={visible} onDismiss={() => setVisible(false)}>
            Saving...
        </Snackbar>
    </SafeAreaView>
    );
};
export default Whitelist;