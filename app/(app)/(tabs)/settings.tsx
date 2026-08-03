import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, Text, TextInput, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '@/components';
import { appModules } from '@/composition/appModules';
import { Contact, parseUser } from '@/core/domain';
import { useAuth } from '@/providers';
import { buttonStyles, containerStyles, globalStyles, textStyles } from '@/styles';

interface EditableContact {
  readonly id: string;
  readonly isNew?: boolean;
  readonly name: string;
  readonly email: string;
}

const Settings = () => {
  const { signOut, user } = useAuth();
  const actor = parseUser(user);
  const isAdmin = user.role === 1 || user.role === 2;
  const router = useRouter();
  const [isEditable, setIsEditable] = useState(false);
  const [contacts, setContacts] = useState<readonly EditableContact[]>([]);
  const [hasChanged, setHasChanged] = useState(false);

  const loadContacts = async () => {
    const result = await appModules.contacts.list(actor);
    if (result.ok) setContacts(result.value);
    else Alert.alert('Could not load contacts', result.error.message);
  };
  useEffect(() => {
    void loadContacts();
  }, []);

  const changeContact = (
    id: string,
    field: 'name' | 'email',
    value: string,
  ) => {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact,
      ),
    );
    setHasChanged(true);
  };
  const saveContacts = async () => {
    if (!hasChanged) {
      setIsEditable(false);
      return;
    }
    const results = await Promise.all(
      contacts.map(({ id, isNew, name, email }) =>
        isNew
          ? appModules.contacts.create(actor, { name, email })
          : appModules.contacts.update(actor, id, { name, email }),
      ),
    );
    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      Alert.alert('Could not save contacts', failed.error.message);
      return;
    }
    setHasChanged(false);
    setIsEditable(false);
    await loadContacts();
  };
  const deleteContact = (contact: EditableContact) => {
    if (contact.isNew) {
      setContacts((current) => current.filter(({ id }) => id !== contact.id));
      return;
    }
    Alert.alert('Delete Contact', `Delete ${contact.name || 'this contact'}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          void appModules.contacts.remove(actor, contact.id).then((result) => {
            if (result.ok) {
              setContacts((current) =>
                current.filter(({ id }) => id !== contact.id),
              );
            } else Alert.alert('Could not delete contact', result.error.message);
          }),
      },
    ]);
  };
  const logout = async () => {
    try {
      await signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert(
        'Could not sign out',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={containerStyles.wrapper}>
      <Button style={buttonStyles.smallButtonTopLeft} onPress={() => void logout()}>
        <Ionicons name="log-out-outline" size={25} color="#fff" />
      </Button>
      {isAdmin ? (
        <Ionicons
          name="lock-closed"
          size={24}
          color="black"
          style={globalStyles.lockIcon}
        />
      ) : null}
      <ScrollView contentContainerStyle={containerStyles.scrollView}>
        <View style={[containerStyles.card, { marginTop: '10%' }]}>
          <Text style={[textStyles.listTitle, { textAlign: 'center' }]}>
            Club Contact Information
          </Text>
          {isAdmin ? (
            <Button
              onPress={() =>
                isEditable ? void saveContacts() : setIsEditable(true)
              }
              style={buttonStyles.smallButtonTopRight}
            >
              <Text style={textStyles.smallButtonText}>
                {isEditable ? 'Save' : 'Edit'}
              </Text>
            </Button>
          ) : null}

          {contacts.map((contact) => (
            <View key={contact.id} style={containerStyles.closeRowStack}>
              {isAdmin && isEditable ? (
                <>
                  <View style={containerStyles.inputContainer}>
                    <TextInput
                      style={textStyles.input}
                      value={contact.name}
                      onChangeText={(text) =>
                        changeContact(contact.id, 'name', text)
                      }
                      placeholder="Enter Name"
                    />
                  </View>
                  <View style={containerStyles.inputContainer}>
                    <TextInput
                      style={textStyles.input}
                      value={contact.email}
                      onChangeText={(text) =>
                        changeContact(contact.id, 'email', text)
                      }
                      placeholder="Enter Email"
                    />
                  </View>
                  <Button
                    onPress={() => deleteContact(contact)}
                    style={[buttonStyles.button, { backgroundColor: 'red' }]}
                  >
                    <Text style={textStyles.smallButtonText}>
                      Delete Above Contact
                    </Text>
                  </Button>
                </>
              ) : (
                <>
                  <Text style={textStyles.detail}>{contact.name}</Text>
                  <Text style={textStyles.detail}>{contact.email}</Text>
                </>
              )}
            </View>
          ))}
          {isAdmin && isEditable ? (
            <Button
              style={buttonStyles.button}
              onPress={() => {
                setContacts((current) => [
                  ...current,
                  {
                    id: `new-${current.length}`,
                    isNew: true,
                    name: '',
                    email: '',
                  },
                ]);
                setHasChanged(true);
              }}
            >
              <Text style={textStyles.smallButtonText}>Add Contact</Text>
            </Button>
          ) : null}
        </View>
      </ScrollView>
      {isAdmin ? (
        <>
          <Button
            style={buttonStyles.bigButton}
            onPress={() => router.push('/settings/manage_users')}
          >
            <Text style={textStyles.bigButtonText}>Manage Users</Text>
          </Button>
          <Button
            style={buttonStyles.bigButton}
            onPress={() => router.push('/settings/manage_whitelist')}
          >
            <Text style={textStyles.bigButtonText}>Manage Whitelist</Text>
          </Button>
        </>
      ) : null}
    </SafeAreaView>
  );
};

export default Settings;
