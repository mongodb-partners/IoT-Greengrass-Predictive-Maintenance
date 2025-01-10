import React, { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './app/screens/HomeScreen';
import { LoginScreen } from './app/screens/LoginScreen';
import { HelpScreen } from './app/screens/HelpScreen';
import { JobScreen } from './app/screens/JobScreen';
import { NavigationContainer } from '@react-navigation/native';


Amplify.configure(awsExports);
const Stack = createNativeStackNavigator();

const App = ({ }) => {

  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        console.log('userId: ', userId);
        setIsLoggedIn(!!userId);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkToken();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>

        <Stack.Navigator initialRouteName={isLoggedIn ? 'Home' : 'Login'} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Jobs" component={JobScreen} />
        </Stack.Navigator>
      </NavigationContainer>

    </SafeAreaProvider>
  );
};

export default (App);
