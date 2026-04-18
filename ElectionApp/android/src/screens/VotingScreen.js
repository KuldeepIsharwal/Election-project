import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import auth from '@react-native-firebase/auth';
import { getCurrentLocation } from '../services/location';

const VotingScreen = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleVote = async (candidateName) => {
    setLoading(true);
    try {
      // 1. Grab the device's GPS coordinates
      const location = await getCurrentLocation();
      
      // 2. We will eventually send this to your Node.js backend
      console.log("Voter Location:", location);
      
      Alert.alert('Success', `Location verified. Vote cast for ${candidateName}!`);
    } catch (error) {
      Alert.alert('Voting Failed', 'Could not verify you are on campus boundaries.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Welcome, {user?.displayName || 'Voter'}</Text>
        <TouchableOpacity onPress={() => auth().signOut()}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Presidential Election</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" style={{ marginTop: 20 }}/>
      ) : (
        <View style={styles.candidateList}>
          {/* We will map through real backend data here later */}
          <TouchableOpacity style={styles.card} onPress={() => handleVote('Alice Smith')}>
            <Text style={styles.cardTitle}>Alice Smith</Text>
            <Text style={styles.cardSub}>3rd Year - Computer Science</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.card} onPress={() => handleVote('Bob Jones')}>
            <Text style={styles.cardTitle}>Bob Jones</Text>
            <Text style={styles.cardSub}>4th Year - Electrical</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#fff',
    elevation: 2 
  },
  headerText: { fontSize: 16, fontWeight: 'bold' },
  logoutText: { color: 'red' },
  title: { fontSize: 24, fontWeight: 'bold', margin: 20 },
  candidateList: { paddingHorizontal: 20 },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 1
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardSub: { color: '#666', marginTop: 5 }
});

export default VotingScreen;