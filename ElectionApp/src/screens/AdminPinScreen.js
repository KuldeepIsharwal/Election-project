import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { verifyAdminPin, setAdminToken } from '../services/api';

const AdminPinScreen = () => {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'Please enter your admin PIN.');
      return;
    }
    setLoading(true);
    try {
      const response = await verifyAdminPin(pin);
      setAdminToken(response.adminToken);
      navigation.replace('AdminDashboard');
    } catch (error) {
      Alert.alert('Access Denied', error.message || 'Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin Access</Text>
        <Text style={styles.subtitle}>Enter your admin PIN to continue</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter PIN"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          keyboardType="number-pad"
          value={pin}
          onChangeText={setPin}
          maxLength={10}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify PIN</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#e8eefc' },
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
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#475569', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 6,
    marginBottom: 16,
  },
  button: { backgroundColor: '#2563eb', borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  buttonDisabled: { opacity: 0.75 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLinkText: { color: '#64748b', fontSize: 13 },
});

export default AdminPinScreen;
