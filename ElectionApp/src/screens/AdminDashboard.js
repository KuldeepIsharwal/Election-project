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
import { fetchAdminResults } from '../services/api';

const AdminDashboard = () => {
  const { user, clearBackendSession } = useAuth();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadResults = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await fetchAdminResults();
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Admin results fetch failed', error);
      Alert.alert('Loading Failed', error.message || 'Could not fetch live election results.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  const handleLogout = async () => {
    clearBackendSession();
    await auth().signOut();
    await GoogleSignin.signOut().catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>Admin Console</Text>
          <Text style={styles.title}>Live Election Leaderboard</Text>
          <Text style={styles.subtitle}>
            Monitor vote totals in real time for {user?.email || 'the current admin'}.
          </Text>
        </View>

        <View style={styles.heroActions}>
          <TouchableOpacity
            style={[styles.refreshButton, refreshing && styles.buttonDisabled]}
            onPress={() => loadResults({ silent: true })}
            disabled={refreshing}>
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : results.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No result data is available yet.</Text>
        </View>
      ) : (
        results.map((candidate, index) => (
          <View key={candidate.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>

              <View style={styles.cardTitleBlock}>
                <Text style={styles.candidateName}>{candidate.name}</Text>
                <Text style={styles.position}>{candidate.position}</Text>
              </View>

              <View style={styles.votePill}>
                <Text style={styles.voteCount}>{candidate.voteCount} votes</Text>
              </View>
            </View>

            <Text style={styles.description}>{candidate.description}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#eef4ff',
    minHeight: '100%',
  },
  hero: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 22,
    marginBottom: 24,
  },
  heroCopy: {
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#93c5fd',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#cbd5e1',
    marginTop: 12,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
  },
  refreshButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginRight: 6,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginLeft: 6,
  },
  logoutButtonText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loader: {
    marginTop: 24,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  cardTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  candidateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  position: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  votePill: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  voteCount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  description: {
    marginTop: 8,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
});

export default AdminDashboard;
