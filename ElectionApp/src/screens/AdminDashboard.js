import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import {
  createElection,
  createPosition,
  deleteApplication,
  deleteElection,
  deletePosition,
  fetchAdminApplications,
  fetchAdminElections,
  fetchAdminResults,
  reviewApplication,
  updateElection,
} from '../services/api';

const TABS = ['Elections', 'Positions', 'Applications', 'Results'];

const formatDateTime = value => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const statusStyles = {
  DRAFT: { backgroundColor: '#e2e8f0', color: '#475569' },
  ACTIVE: { backgroundColor: '#dcfce7', color: '#166534' },
  ENDED: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  PENDING: { backgroundColor: '#fef3c7', color: '#92400e' },
  APPROVED: { backgroundColor: '#dcfce7', color: '#166534' },
  REJECTED: { backgroundColor: '#fee2e2', color: '#b91c1c' },
};

const StatusBadge = ({ status }) => {
  const palette = statusStyles[status] ?? { backgroundColor: '#e2e8f0', color: '#475569' };

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{status}</Text>
    </View>
  );
};

const PickerRow = ({ label, value, options, onChange, placeholder = 'Select one' }) => {
  return (
    <View style={styles.pickerBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {options.length === 0 ? (
          <View style={styles.emptyInline}>
            <Text style={styles.emptyInlineText}>{placeholder}</Text>
          </View>
        ) : (
          options.map(option => {
            const selected = value === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.choiceChip, selected && styles.choiceChipActive]}
                onPress={() => onChange(option.id)}>
                <Text style={[styles.choiceChipText, selected && styles.choiceChipTextActive]}>
                  {option.title ?? option.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const groupByPosition = items => {
  return items.reduce((acc, item) => {
    const key = item.position?.name ?? item.positionName ?? item.position ?? 'Unassigned';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
};

const AdminDashboard = () => {
  const { clearBackendSession } = useAuth();
  const [activeTab, setActiveTab] = useState('Elections');
  const [loading, setLoading] = useState(true);
  const [elections, setElections] = useState([]);
  const [selectedElectionId, setSelectedElectionId] = useState(null);
  const [applicationElectionId, setApplicationElectionId] = useState(null);
  const [resultElectionId, setResultElectionId] = useState(null);
  const [positionsInput, setPositionsInput] = useState('');
  const [applications, setApplications] = useState([]);
  const [results, setResults] = useState([]);
  const [showElectionForm, setShowElectionForm] = useState(false);
  const [editingElectionId, setEditingElectionId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const selectedElection = useMemo(
    () => elections.find(election => election.id === selectedElectionId) ?? null,
    [elections, selectedElectionId]
  );

  useEffect(() => {
    loadElections();
  }, []);

  const loadElections = async () => {
    try {
      setLoading(true);
      const data = await fetchAdminElections();
      const list = Array.isArray(data) ? data : [];
      setElections(list);

      const fallbackId = list[0]?.id ?? null;
      setSelectedElectionId(current => current ?? fallbackId);
      setApplicationElectionId(current => current ?? fallbackId);
      setResultElectionId(current => current ?? fallbackId);
    } catch (error) {
      Alert.alert('Loading Failed', error.message || 'Could not fetch elections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Applications' && applicationElectionId) {
      loadApplications(applicationElectionId);
    }
  }, [activeTab, applicationElectionId]);

  useEffect(() => {
    if (activeTab === 'Results' && resultElectionId) {
      loadResults(resultElectionId);
    }
  }, [activeTab, resultElectionId]);

  const loadApplications = async electionId => {
    try {
      setLoading(true);
      const data = await fetchAdminApplications(electionId);
      setApplications(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Loading Failed', error.message || 'Could not fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async electionId => {
    try {
      setLoading(true);
      const data = await fetchAdminResults(electionId);
      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Loading Failed', error.message || 'Could not fetch results.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    clearBackendSession();
    await auth().signOut();
    await GoogleSignin.signOut().catch(() => {});
  };

  const resetElectionForm = () => {
    setEditingElectionId(null);
    setFormTitle('');
    setFormStartDate('');
    setFormEndDate('');
    setShowElectionForm(false);
  };

  const openEditElection = election => {
    setEditingElectionId(election.id);
    setFormTitle(election.title ?? '');
    setFormStartDate(election.startDate ?? '');
    setFormEndDate(election.endDate ?? '');
    setShowElectionForm(true);
  };

  const submitElectionForm = async () => {
    if (!formTitle.trim() || !formStartDate.trim() || !formEndDate.trim()) {
      Alert.alert('Invalid Form', 'Title, start date, and end date are required.');
      return;
    }

    try {
      if (editingElectionId) {
        await updateElection(editingElectionId, {
          title: formTitle.trim(),
          startDate: formStartDate.trim(),
          endDate: formEndDate.trim(),
        });
      } else {
        await createElection(formTitle.trim(), formStartDate.trim(), formEndDate.trim());
      }

      resetElectionForm();
      await loadElections();
    } catch (error) {
      Alert.alert('Save Failed', error.message || 'Could not save election.');
    }
  };

  const confirmDeleteElection = electionId => {
    Alert.alert('Delete Election', 'Are you sure you want to delete this election?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteElection(electionId);
            await loadElections();
          } catch (error) {
            Alert.alert('Delete Failed', error.message || 'Could not delete election.');
          }
        },
      },
    ]);
  };

  const confirmDeletePosition = positionId => {
    Alert.alert('Delete Position', 'Are you sure you want to delete this position?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePosition(positionId);
            await loadElections();
          } catch (error) {
            Alert.alert('Delete Failed', error.message || 'Could not delete position.');
          }
        },
      },
    ]);
  };

  const handleAddPosition = async () => {
    if (!selectedElectionId || !positionsInput.trim()) {
      Alert.alert('Invalid Position', 'Choose an election and enter a position name.');
      return;
    }

    try {
      await createPosition(selectedElectionId, positionsInput.trim());
      setPositionsInput('');
      await loadElections();
    } catch (error) {
      Alert.alert('Add Failed', error.message || 'Could not add position.');
    }
  };

  const groupedApplications = groupByPosition(applications);
  const groupedResults = groupByPosition(results);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
        ) : null}

        {activeTab === 'Elections' ? (
          <>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setShowElectionForm(true)}>
              <Text style={styles.primaryButtonText}>New Election</Text>
            </TouchableOpacity>

            {showElectionForm ? (
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="Election title"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={styles.input}
                  value={formStartDate}
                  onChangeText={setFormStartDate}
                  placeholder="Start Date (2026-04-25T10:00)"
                  placeholderTextColor="#94a3b8"
                />
                <TextInput
                  style={styles.input}
                  value={formEndDate}
                  onChangeText={setFormEndDate}
                  placeholder="End Date (2026-04-25T18:00)"
                  placeholderTextColor="#94a3b8"
                />

                <View style={styles.rowButtons}>
                  <TouchableOpacity style={styles.primaryButtonInline} onPress={submitElectionForm}>
                    <Text style={styles.primaryButtonText}>
                      {editingElectionId ? 'Update' : 'Create'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButtonInline} onPress={resetElectionForm}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {elections.map(election => (
              <View key={election.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{election.title}</Text>
                  <StatusBadge status={election.status ?? 'DRAFT'} />
                </View>
                <Text style={styles.metaText}>Start: {formatDateTime(election.startDate)}</Text>
                <Text style={styles.metaText}>End: {formatDateTime(election.endDate)}</Text>
                <Text style={styles.metaText}>Votes: {election.voteCount ?? election._count?.votes ?? 0}</Text>
                <Text style={styles.metaText}>
                  Applications: {election.applicationCount ?? election._count?.applications ?? 0}
                </Text>

                <View style={styles.actionWrap}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => openEditElection(election)}>
                    <Text style={styles.smallButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={async () => {
                      await updateElection(election.id, { status: 'ACTIVE' });
                      await loadElections();
                    }}>
                    <Text style={styles.smallButtonText}>Set Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={async () => {
                      await updateElection(election.id, { status: 'ENDED' });
                      await loadElections();
                    }}>
                    <Text style={styles.smallButtonText}>Set Ended</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.smallButton, styles.deleteButton]}
                    onPress={() => confirmDeleteElection(election.id)}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {activeTab === 'Positions' ? (
          <>
            <PickerRow
              label="Select Election"
              value={selectedElectionId}
              options={elections}
              onChange={setSelectedElectionId}
            />

            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={positionsInput}
                onChangeText={setPositionsInput}
                placeholder="Enter position name"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity style={styles.primaryButtonInline} onPress={handleAddPosition}>
                <Text style={styles.primaryButtonText}>Add Position</Text>
              </TouchableOpacity>
            </View>

            {(selectedElection?.positions ?? []).map(position => (
              <View key={position.id} style={styles.card}>
                <Text style={styles.cardTitle}>{position.name ?? position.positionName}</Text>
                <TouchableOpacity
                  style={[styles.smallButton, styles.deleteButton, styles.topGap]}
                  onPress={() => confirmDeletePosition(position.id)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {activeTab === 'Applications' ? (
          <>
            <PickerRow
              label="Select Election"
              value={applicationElectionId}
              options={elections}
              onChange={setApplicationElectionId}
            />

            {Object.entries(groupedApplications).map(([positionName, items]) => (
              <View key={positionName} style={styles.section}>
                <Text style={styles.sectionTitle}>{positionName}</Text>
                {items.map(application => (
                  <View key={application.id} style={styles.card}>
                    <View style={styles.applicationHeader}>
                      {application.photoUrl || application.photo ? (
                        <Image
                          source={{ uri: application.photoUrl ?? application.photo }}
                          style={styles.applicationPhoto}
                        />
                      ) : (
                        <View style={[styles.applicationPhoto, styles.photoFallback]} />
                      )}
                      <View style={styles.applicationMeta}>
                        <Text style={styles.cardTitle}>{application.name}</Text>
                        <Text style={styles.metaText}>{application.rollNo ?? application.rollNumber}</Text>
                        <Text style={styles.metaText}>{positionName}</Text>
                      </View>
                      <StatusBadge status={application.status ?? 'PENDING'} />
                    </View>

                    <View style={styles.actionWrap}>
                      {application.status === 'PENDING' ? (
                        <>
                          <TouchableOpacity
                            style={[styles.smallButton, styles.approveButton]}
                            onPress={async () => {
                              await reviewApplication(application.id, 'APPROVED');
                              await loadApplications(applicationElectionId);
                            }}>
                            <Text style={styles.smallButtonText}>Approve</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.smallButton, styles.rejectButton]}
                            onPress={async () => {
                              await reviewApplication(application.id, 'REJECTED');
                              await loadApplications(applicationElectionId);
                            }}>
                            <Text style={styles.smallButtonText}>Reject</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.smallButton, styles.deleteButton]}
                        onPress={async () => {
                          await deleteApplication(application.id);
                          await loadApplications(applicationElectionId);
                        }}>
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {activeTab === 'Results' ? (
          <>
            <PickerRow
              label="Select Election"
              value={resultElectionId}
              options={elections}
              onChange={setResultElectionId}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => resultElectionId && loadResults(resultElectionId)}>
              <Text style={styles.primaryButtonText}>Refresh</Text>
            </TouchableOpacity>

            {Object.entries(groupedResults).map(([positionName, items]) => (
              <View key={positionName} style={styles.section}>
                <Text style={styles.sectionTitle}>{positionName}</Text>
                {items.map((candidate, index) => (
                  <View key={candidate.id} style={styles.card}>
                    <View style={styles.applicationHeader}>
                      <Text style={styles.rankLabel}>#{index + 1}</Text>
                      {candidate.photoUrl || candidate.photo ? (
                        <Image
                          source={{ uri: candidate.photoUrl ?? candidate.photo }}
                          style={styles.applicationPhoto}
                        />
                      ) : (
                        <View style={[styles.applicationPhoto, styles.photoFallback]} />
                      )}
                      <View style={styles.applicationMeta}>
                        <Text style={styles.cardTitle}>{candidate.name}</Text>
                        <Text style={styles.metaText}>{candidate.rollNo ?? candidate.rollNumber}</Text>
                      </View>
                      <Text style={styles.voteCountText}>{candidate.voteCount} votes</Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: '#f8fafc',
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
  },
  tabButtonActive: {
    backgroundColor: '#2563eb',
  },
  tabButtonText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  container: {
    padding: 16,
    minHeight: '100%',
  },
  loader: {
    marginTop: 24,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
  },
  primaryButtonInline: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButtonInline: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 15,
  },
  rowButtons: {
    flexDirection: 'row',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    paddingRight: 12,
  },
  metaText: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  smallButton: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '700',
  },
  approveButton: {
    backgroundColor: '#16a34a',
  },
  rejectButton: {
    backgroundColor: '#dc2626',
  },
  topGap: {
    marginTop: 10,
  },
  pickerBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 8,
  },
  choiceChip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
  },
  choiceChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  choiceChipText: {
    color: '#334155',
    fontWeight: '700',
  },
  choiceChipTextActive: {
    color: '#fff',
  },
  emptyInline: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyInlineText: {
    color: '#64748b',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    color: '#0f172a',
    fontSize: 15,
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  applicationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  applicationPhoto: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    marginRight: 12,
  },
  photoFallback: {
    opacity: 0.6,
  },
  applicationMeta: {
    flex: 1,
    paddingRight: 10,
  },
  rankLabel: {
    width: 34,
    fontSize: 14,
    fontWeight: '800',
    color: '#2563eb',
  },
  voteCountText: {
    color: '#2563eb',
    fontWeight: '800',
  },
});

export default AdminDashboard;
