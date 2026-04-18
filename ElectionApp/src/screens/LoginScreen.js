import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';

GoogleSignin.configure({
  webClientId:
    '626587458923-o4s3d52pv0fi0fn2f0425dc0h1f9f6pk.apps.googleusercontent.com',
});

const LoginScreen = () => {
  const [loading, setLoading] = useState(false);
  const { setBackendStudent, clearBackendSession } = useAuth();

  const onGoogleButtonPress = async () => {
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const response = await GoogleSignin.signIn();
      const idToken = response?.data?.idToken ?? response?.idToken;

      if (!idToken) {
        throw new Error('No Google ID token received');
      }

      const backendStudent = await loginUser(idToken);
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      await auth().signInWithCredential(googleCredential);
      setBackendStudent(backendStudent);
    } catch (error) {
      console.error('Google sign-in failed', error);
      clearBackendSession();
      await auth().signOut().catch(() => {});

      if (error.status === 403) {
        await GoogleSignin.signOut().catch(() => {});
        Alert.alert(
          'Unauthorized Domain',
          'Only @iiitmanipur.ac.in accounts are allowed to use this app.',
        );
        return;
      }

      Alert.alert('Login Failed', error.message || 'Could not sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Campus Election</Text>
        <Text style={styles.subtitle}>Secure voting portal for verified students</Text>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onGoogleButtonPress}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in with College Gmail</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#e8eefc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;
