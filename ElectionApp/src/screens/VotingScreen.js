import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getCurrentLocation, isWithinCampusBoundary } from '../services/location';
import { fetchCurrentElection, castVote } from '../services/api';

const VotingScreen = () => {
  const navigation = useNavigation();
  const { user, backendStudent, setBackendStudent, clearBackendSession } = useAuth();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [votedPositions, setVotedPositions] = useState({});
  const [loadingCandidateId, setLoadingCandidateId] = useState(null);

  useEffect(() => {
    loadElection();
  }, []);

  const loadElection = async () => {
    try {
      setLoading(true);
      const data = await fetchCurrentElection();
      setElection(data);
    } catch (error) {
      setElection(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearBackendSession();
    await auth().signOut();
    await GoogleSignin.signOut().catch(() => {});
  };

  const handleApply = () => {
    navigation.navigate('Apply');
  };

  const handleVote = async (candidate, position) => {
    if (election?.status !== 'ACTIVE') {
      Alert.alert('Not Open', 'Voting is not open yet.');
      return;
    }
    if (votedPositions[position.id]) {
      Alert.alert('Already Voted', 'You have already voted for this position.');
      return;
    }
    Alert.alert(
      'Confirm Vote',
      `Vote for ${candidate.name} as ${position.positionName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Vote',
          onPress: async () => {
            setLoadingCandidateId(candidate.id);
            try {
              const location = await getCurrentLocation();
              if (!isWithinCampusBoundary(location)) {
                Alert.alert('Voting Blocked', 'You must be inside campus to vote.');
                return;
              }
              await castVote(election.id, position.id, candidate.id, location.latitude, location.longitude);
              setVotedPositions(prev => ({ ...prev, [position.id]: candidate.id }));
              Alert.alert('Vote Recorded', `Your vote for ${candidate.name} has been submitted.`);
            } catch (error) {
              if (error.status === 400) {
                setVotedPositions(prev => ({ ...prev, [position.id]: true }));
                Alert.alert('Already Voted', 'You already voted for this position.');
                return;
              }
              Alert.alert('Failed', error.message || 'Could not submit vote.');
            } finally {
              setLoadingCandidateId(null);
            }
          },
        },
      ]
    );
  };

  const now = new Date();
  const isActive = election?.status === 'ACTIVE' &&
    new Date(election.startDate) <= now &&
    new Date(election.endDate) >= now;
  const isDraft = election?.status === 'DRAFT';
  const isEnded = election?.status === 'ENDED' ||
    (election?.status === 'ACTIVE' && new Date(election.endDate) < now);

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.userName}>{user?.displayName || 'Student'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>
      <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!election) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {renderHeader()}
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>No Election Active</Text>
          <Text style={styles.messageText}>There is no upcoming election at this time.</Text>
        </View>
      </ScrollView>
    );
  }

  if (isEnded) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        {renderHeader()}
        <View style={styles.messageBox}>
          <Text style={styles.messageTitle}>Election Ended</Text>
          <Text style={styles.messageText}>The election has ended. Thank you for participating!</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {renderHeader()}

      <View style={styles.electionHeader}>
        <Text style={styles.electionTitle}>{election.title}</Text>
        {isDraft && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftBannerText}>
              📋 Applications Open — Voting starts on {new Date(election.startDate).toLocaleString()}
            </Text>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply as Candidate</Text>
            </TouchableOpacity>
          </View>
        )}
        {isActive && (
          <View style={styles.activeBanner}>
            <Text style={styles.activeBannerText}>
              🗳️ Voting is OPEN — Closes {new Date(election.endDate).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      {election.positions?.map(position => (
        <View key={position.id} style={styles.positionSection}>
          <Text style={styles.positionTitle}>{position.positionName}</Text>
          {position.candidates?.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {isDraft ? 'No approved candidates yet.' : 'No candidates for this position.'}
              </Text>
            </View>
          ) : (
            position.candidates.map(candidate => {
              const isVotedForThis = votedPositions[position.id] === candidate.id;
              const isPositionVoted = Boolean(votedPositions[position.id]);
              const isThisLoading = loadingCandidateId === candidate.id;
              return (
                <View key={candidate.id} style={[styles.candidateCard, isVotedForThis && styles.votedCard]}>
                  {candidate.photoUrl ? (
                    <Image source={{ uri: candidate.photoUrl }} style={styles.photo} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={styles.photoPlaceholderText}>
                        {candidate.name?.charAt(0) || '?'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName}>{candidate.name}</Text>
                    <Text style={styles.candidateRoll}>{candidate.rollNo}</Text>
                  </View>
                  {isActive && (
                    <TouchableOpacity
                      style={[styles.voteButton, (isPositionVoted || isThisLoading) && styles.voteButtonDisabled]}
                      onPress={() => handleVote(candidate, position)}
                      disabled={isPositionVoted || Boolean(loadingCandidateId)}>
                      {isThisLoading ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.voteButtonText}>
                          {isVotedForThis ? '✓ Voted' : isPositionVoted ? 'Done' : 'Vote'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                  {isDraft && (
                    <View style={styles.approvedBadge}>
                      <Text style={styles.approvedBadgeText}>Approved</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc', minHeight: '100%' },
  centered: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  welcome: { fontSize: 14, color: '#64748b' },
  userName: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  userEmail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  logoutText: { color: '#dc2626', fontWeight: '600', fontSize: 15 },
  messageBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 40 },
  messageTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  messageText: { fontSize: 14, color: '#475569', textAlign: 'center' },
  electionHeader: { marginBottom: 20 },
  electionTitle: { fontSize: 24, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  draftBanner: { backgroundColor: '#fef9c3', borderRadius: 12, padding: 14 },
  draftBannerText: { fontSize: 13, color: '#854d0e', marginBottom: 12 },
  applyButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  applyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  activeBanner: { backgroundColor: '#dcfce7', borderRadius: 12, padding: 14 },
  activeBannerText: { fontSize: 13, color: '#166534' },
  positionSection: { marginBottom: 24 },
  positionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  candidateCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  votedCard: { borderWidth: 1.5, borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  photo: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  photoPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#e2e8f0', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 22, fontWeight: '700', color: '#64748b' },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  candidateRoll: { fontSize: 13, color: '#64748b', marginTop: 2 },
  voteButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  voteButtonDisabled: { backgroundColor: '#94a3b8' },
  voteButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  approvedBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 8 },
  approvedBadgeText: { color: '#166534', fontSize: 12, fontWeight: '600' },
});

export default VotingScreen;