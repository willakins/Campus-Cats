import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Text, SafeAreaView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, StackScreenProps } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
};

type SplashScreenProps = StackScreenProps<RootStackParamList, 'Splash'>;

const Stack = createStackNavigator<RootStackParamList>();

const SplashScreen: React.FC<SplashScreenProps> = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.splashContainer}>
      <Image
        style={styles.splashImage}
        source={require('../assets/images/app-icon.png')}
      />
    </SafeAreaView>
  </SafeAreaProvider>
  );
};

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.homeContainer}>
      <Text style={styles.homeText}>We</Text>
    </View>
  );
};

export default function App() {
  return ( 
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  splashImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  homeText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});
