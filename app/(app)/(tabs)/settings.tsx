import { Text, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { globalStyles, buttonStyles, textStyles, containerStyles } from '@/styles';

import { useAuth } from '@/providers';

const Settings = () => {
  const { signOut, user } = useAuth();
  const router = useRouter();

  const adminStatus = user.role === 1 || user.role === 2;

  const handleLogout = async () => {
    await signOut();
    router.push('/login')
  };
  const handleCreateAdmins = () => {
    router.push('/settings/create_admins');
  };

  return (
    <View style={globalStyles.screen}>
      <TouchableOpacity style={buttonStyles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={25} color="#fff" />
      </TouchableOpacity>
      <Text>Setting Screen</Text>
      {adminStatus ? (<>
        <TouchableOpacity style={buttonStyles.button} onPress={handleCreateAdmins}>
          <Text style={textStyles.smallButtonText}>Make someone else an admin</Text>
        </TouchableOpacity>
        <Ionicons
          name="lock-closed"
          size={24}
          color="black"
          style={globalStyles.lockIcon}
        />
      </>) : null}
    </View>
  );
}
export default Settings;