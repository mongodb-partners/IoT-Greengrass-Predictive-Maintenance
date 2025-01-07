import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from './app/screens/HomeScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ApolloClient from './apollo.client';
import { LoginScreen } from './app/screens/LoginScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApolloProvider } from "@apollo/client";
import { HelpScreen } from './app/screens/HelpScreen';

const Stack = createStackNavigator();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        setIsLoggedIn(!!userId);
      } catch (error) {
        setIsLoggedIn(false);
      }
    };

    checkToken();
  }, []);

  return (
    <ApolloProvider client={ApolloClient}>
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
          <NavigationContainer>
          <Stack.Navigator
              initialRouteName={isLoggedIn ? 'Home' : 'Login'}
            >
              <Stack.Screen
                options={{ headerShown: false }}
                name="Home"
                component={HomeScreen}
              />
              <Stack.Screen
                options={{ headerShown: false }}
                name="Login"
                component={LoginScreen}
              />
              <Stack.Screen
                options={{ headerShown: false }}
                name="Help"
                component={HelpScreen}
              />
            </Stack.Navigator>

          </NavigationContainer>
      </SafeAreaView>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});

export default App;
