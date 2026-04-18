import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// IMPORTANT: You will need to get this Web Client ID from your Firebase Console
// Project Settings -> General -> Your Apps -> Web App configuration
GoogleSignin.configure({
  webClientId: '626587458923-o4s3d52pv0fi0fn2f0425dc0h1f9f6pk.apps.googleusercontent.com',
});

const LoginScreen = () => {
  const onGoogleButtonPress = async () => {
    try {
      // 1. Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // 2. Open the Google prompt and get the token
      const { idToken } = await GoogleSignin.signIn();
      
      // 3. Create a Firebase credential using that token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      
      // 4. Sign the user into Firebase
      await auth().signInWithCredential(googleCredential);
      
      // Note: At this point, AppNavigator will automatically detect the login 
      // and switch to the VotingScreen!
      
    } catch (error) {
      console.error(error);
      Alert.alert('Login Failed', 'Could not sign in with Google.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campus Election</Text>
      <Text style={styles.subtitle}>Secure Voting Portal</Text>
      
      <TouchableOpacity style={styles.button} onPress={onGoogleButtonPress}>
        <Text style={styles.buttonText}>Sign in with College Gmail</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: 5 
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40
  },
  button: {
    backgroundColor: '#4285F4', // Google Blue
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 3, // Shadow for Android
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default LoginScreen;