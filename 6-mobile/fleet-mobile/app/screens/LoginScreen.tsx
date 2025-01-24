import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { login as loginMutation } from '../mutations';
import { colors } from '../styles/colors';
import { generateClient } from 'aws-amplify/api';
import { createTable, getDBConnection } from '../sqlite/db-service';
const logo = require('../styles/assets/logo-wekan.png');

const client = generateClient();

export function LoginScreen() {

  const navigation = useNavigation();

  const [email, setEmail] = useState('technician@live.in');
  const [password, setPassword] = useState('123');
  const [hadError, setHadError] = useState(false);
  const [loading, setLoading] = useState(false);


  const loginUser = async () => {
    setLoading(true);
    const response = await client.graphql({ query: loginMutation, variables: { email, password } });
    setLoading(false);
    if (response?.data?.login?._id) {
      const db = await getDBConnection();
      await createTable(db);
      await AsyncStorage.setItem('userId', response?.data?.login?._id);
      navigation.navigate('Home');
    } else {
      setHadError('Invalid Credentials');
    }
  };

  return (
    <View style={styles.container}>
      <Image
        alt="Atlas App Services"
        resizeMode="contain"
        source={logo}
        style={styles.logo}
      />
      <View style={styles.form}>
        <TextInput
          accessibilityLabel="Enter email"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.grayDark}
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />
        <TextInput
          accessibilityLabel="Enter password"
          autoComplete="password"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.grayDark}
          secureTextEntry
          style={styles.input}
          textContentType="password"
          value={password}
        />
        {hadError && <Text style={styles.error}>{hadError}</Text>}
        <View style={styles.buttons}>
          <Pressable
            disabled={loading}
            onPress={() => loginUser()}
            style={[styles.button, loading && styles.disabled]}>
            <Text style={styles.buttonText}>Log In</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grayDark,
  },
  logo: {
    height: 150,
    alignItems: 'flex-end',
    width: 150,
  },
  title: {
    marginBottom: 50,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.black,
  },
  form: {
    width: '85%',
    paddingHorizontal: 30,
    paddingVertical: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 5,
    borderColor: colors.grayMedium,
    backgroundColor: colors.white,
  },
  input: {
    alignSelf: 'stretch',
    marginBottom: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 5,
    borderColor: colors.grayMedium,
    backgroundColor: colors.grayLight,
    fontSize: 16,
    color: colors.grayDark,
  },
  error: {
    marginTop: 10,
    textAlign: 'center',
    color: colors.grayDark,
  },
  buttons: {
    marginTop: 10,
    flexDirection: 'row',
  },
  button: {
    width: 120,
    marginHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: colors.black,
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.white,
  },
  disabled: {
    opacity: 0.8,
  },
});
