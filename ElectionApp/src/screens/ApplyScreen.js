import React, { useEffect, useState } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { fetchCurrentElection, submitApplication } from '../services/api';

const ApplyScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [election, setElection] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [name, setName] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [photoUri, setPhotoUri] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadElection = async () => {
      try {
        const currentElection = await fetchCurrentElection();

        if (!isMounted) {
          return;
        }

        const availablePositions = currentElection?.positions ?? [];
        setElection(currentElection);
        setPositions(availablePositions);
        setSelectedPositionId(availablePositions[0]?.id ?? null);
      } catch (error) {
        console.error('Apply screen load failed', error);
        if (isMounted) {
          Alert.alert('Loading Failed', error.message || 'Could not load the current election.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadElection();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
    });

    if (result.didCancel) {
      return;
    }

    const asset = result.assets?.[0];
    if (asset?.uri) {
      setPhotoUri(asset.uri);
    }
  };

  const handleSubmit = async () => {
    if (!election?.id || !selectedPositionId || !name.trim() || !rollNo.trim() || !photoUri) {
      Alert.alert('Incomplete Form', 'Please fill all fields and upload a photo.');
      return;
    }

    setSubmitting(true);
    try {
      await submitApplication(election.id, selectedPositionId, name.trim(), rollNo.trim(), photoUri);
      Alert.alert('Success', 'Application submitted! Waiting for admin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Submission Failed', error.message || 'Could not submit your application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Apply as Candidate</Text>
        <Text style={styles.subtitle}>{election?.title ?? 'Active Election'}</Text>

        <Text style={styles.label}>Select Position</Text>
        <View style={styles.optionList}>
          {positions.map(position => {
            const active = position.id === selectedPositionId;
            return (
              <TouchableOpacity
                key={position.id}
                style={[styles.optionChip, active && styles.optionChipActive]}
                onPress={() => setSelectedPositionId(position.id)}>
                <Text style={[styles.optionChipText, active && styles.optionChipTextActive]}>
                  {position.name ?? position.positionName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor="#94a3b8"
        />

        <Text style={styles.label}>Roll Number</Text>
        <TextInput
          style={styles.input}
          value={rollNo}
          onChangeText={setRollNo}
          placeholder="Enter your roll number"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity style={styles.uploadButton} onPress={handlePickImage}>
          <Text style={styles.uploadButtonText}>Upload Photo</Text>
        </TouchableOpacity>

        {photoUri ? <Image source={{ uri: photoUri }} style={styles.preview} /> : null}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={handleSubmit}>
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
    backgroundColor: '#f8fafc',
    minHeight: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 8,
    marginBottom: 18,
  },
  label: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 14,
  },
  optionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  optionChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    color: '#0f172a',
    fontSize: 15,
  },
  uploadButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  uploadButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    marginTop: 16,
    backgroundColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.75,
  },
});

export default ApplyScreen;
