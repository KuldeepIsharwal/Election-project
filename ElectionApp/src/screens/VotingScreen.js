import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { getCurrentLocation, isWithinCampusBoundary } from '../services/location';
import { fetchCandidates as getCandidates, submitVote } from '../services/api';

const VotingScreen = () => {
  const { user, backendStudent, setBackendStudent, clearBackendSession } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const [loadingCandidateId, setLoadingCandidateId] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [votingLocked, setVotingLocked] = useState(Boolean(backendStudent?.hasVoted));

  useEffect(() => {
    setVotingLocked(Boolean(backendStudent?.hasVoted));
  }, [backendStudent?.hasVoted]);

  useEffect(() => {
    let isMounted = true;

    const loadCandidates = async () => {
      try {
        setLoadingCandidates(true);
        const data = await getCandidates();

        if (isMounted) {
          setCandidates(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Candidate fetch failed', error);
        if (isMounted) {
          Alert.alert('Loading Failed', 'Could not fetch candidates from the server.');
        }
      } finally {
        if (isMounted) {
          setLoadingCandidates(false);
        }
      }
    };

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    clearBackendSession();
    await auth().signOut();
    await GoogleSignin.signOut().catch(() => {});
  };

  const handleVote = async candidate => {
    if (votingLocked) {
      Alert.alert('Vote Locked', 'Your account has already submitted a vote.');
      return;
    }

    if (!backendStudent?.studentId) {
      Alert.alert('Missing Student Data', 'Please sign in again before voting.');
      return;
    }

    setLoadingCandidateId(candidate.id);

    try {
      const location = await getCurrentLocation();
      const isOnCampus = isWithinCampusBoundary(location);

      if (!isOnCampus) {
        Alert.alert('Voting Blocked', 'You must be inside campus boundaries to vote.');
        return;
      }

      await submitVote(backendStudent.studentId, candidate.id);

      setSelectedCandidateId(candidate.id);
      setVotingLocked(true);
      setBackendStudent({
        ...backendStudent,
        hasVoted: true,
      });
      Alert.alert(
        'Vote Recorded',
        `Your vote for ${candidate.name} has been submitted successfully.`,
      );
    } catch (error) {
      console.error('Vote flow failed', error);

      if (error.status === 400 && error.payload?.message === 'Already voted') {
        setVotingLocked(true);
        setBackendStudent({
          ...backendStudent,
          hasVoted: true,
        });
        Alert.alert('Already Voted', 'This account has already cast a vote.');
        return;
      }

      Alert.alert('Voting Failed', error.message || 'Could not complete your vote.');
    } finally {
      setLoadingCandidateId(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Welcome</Text>
          <Text style={styles.userName}>{user?.displayName || 'Voter'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'Signed-in user'}</Text>
        </View>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Presidential Election</Text>
        <Text style={styles.sectionSubtitle}>
          {votingLocked
            ? 'Your account has already voted. Results submission is locked.'
            : 'Select one candidate. Your vote will be validated and sent to the backend.'}
        </Text>
      </View>

      {loadingCandidates ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.fetchLoader} />
      ) : candidates.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No candidates are available yet.</Text>
        </View>
      ) : (
        candidates.map(candidate => {
        const isLoading = loadingCandidateId === candidate.id;
        const isSelected = selectedCandidateId === candidate.id;

        return (
          <TouchableOpacity
            key={candidate.id}
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={() => handleVote(candidate)}
            disabled={Boolean(loadingCandidateId) || votingLocked}>
            <View>
              <Text style={styles.cardTitle}>{candidate.name}</Text>
              <Text style={styles.cardSub}>{candidate.position}</Text>
              <Text style={styles.cardSub}>{candidate.description}</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#2563eb" />
            ) : (
              <Text style={styles.voteAction}>
                {isSelected || votingLocked ? 'Submitted' : 'Vote'}
              </Text>
            )}
          </TouchableOpacity>
        );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8fafc',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcome: {
    fontSize: 14,
    color: '#64748b',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
    lineHeight: 20,
  },
  fetchLoader: {
    marginTop: 32,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  selectedCard: {
    borderWidth: 1,
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSub: {
    fontSize: 14,
    color: '#475569',
    marginTop: 6,
  },
  voteAction: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
  },
});

export default VotingScreen;
