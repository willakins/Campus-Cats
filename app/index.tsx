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
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaProvider>
    <SafeAreaView style={styles.splashContainer}>
      <Image
        style={styles.splashImage}
        source={require('../assets/images/app-icon.png')}
      />
    <Text style={styles.splashText}>Georgia Tech Campus Cats!</Text>
    </SafeAreaView>
  </SafeAreaProvider>
  );
};

const HomeScreen: React.FC = () => {
  return (
    <View style={styles.homeContainer}>
      <Text style={styles.homeText}>Log in here</Text>
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
    backgroundColor: '#F3E5F5',
  },
  splashImage: {
    width: 400,
    height: 400,
    resizeMode: 'contain',
  },
  splashText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B0082', 
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
  },
  homeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B0082',
  },
});


