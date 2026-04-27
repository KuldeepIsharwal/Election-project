const API_BASE_URL = 'https://election-backend-production-8099.up.railway.app';

let authToken = null;
let adminToken = null;

export const setAuthToken = token => {
  authToken = token;
};
export const setAdminToken = token => {
  adminToken = token;
};
export const clearTokens = () => {
  authToken = null;
  adminToken = null;
};

const parseJsonSafely = async response => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const request = async (path, options = {}, useAdminToken = false) => {
  try {
    const token = useAdminToken ? adminToken : authToken;
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });
    const payload = await parseJsonSafely(response);
    if (!response.ok) {
      const error = new Error(payload?.message || 'Request failed');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  } catch (error) {
    if (typeof error.status === 'number') {
      throw error;
    }
    const networkError = new Error(error.message || 'Network request failed');
    networkError.cause = error;
    throw networkError;
  }
};

export const loginUser = idToken =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ idToken }) });
export const verifyAdminPin = pin =>
  request('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin }) });
export const fetchCandidates = () => request('/api/candidates');
export const submitVote = (candidateId, latitude, longitude) =>
  request('/api/vote', {
    method: 'POST',
    body: JSON.stringify({ candidateId, latitude, longitude }),
  });
export const fetchAdminResults = electionId =>
  request(`/api/admin/results${electionId ? `?electionId=${electionId}` : ''}`, {}, true);

// Election
export const createElection = (title, startDate, endDate) =>
  request('/api/admin/election', { method: 'POST', body: JSON.stringify({ title, startDate, endDate }) }, true);

export const fetchAdminElections = () => request('/api/admin/elections', {}, true);

export const updateElection = (id, data) =>
  request(`/api/admin/election/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, true);

export const deleteElection = (id) =>
  request(`/api/admin/election/${id}`, { method: 'DELETE' }, true);

// Positions
export const createPosition = (electionId, positionName) =>
  request('/api/admin/position', { method: 'POST', body: JSON.stringify({ electionId, positionName }) }, true);

export const deletePosition = (id) =>
  request(`/api/admin/position/${id}`, { method: 'DELETE' }, true);

// Applications
export const fetchAdminApplications = (electionId) =>
  request(`/api/admin/applications?electionId=${electionId}`, {}, true);

export const reviewApplication = (id, status) =>
  request(`/api/admin/application/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }, true);

export const deleteApplication = (id) =>
  request(`/api/admin/application/${id}`, { method: 'DELETE' }, true);

// Student
export const fetchCurrentElection = () => request('/api/election/current');
export const fetchMyApplications = () => request('/api/my-applications');

export const submitApplication = async (electionId, positionId, name, rollNo, photoUri) => {
  const formData = new FormData();
  formData.append('electionId', String(electionId));
  formData.append('positionId', String(positionId));
  formData.append('name', name);
  formData.append('rollNo', rollNo);
  formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' });
  const response = await fetch(`${API_BASE_URL}/api/apply`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || 'Request failed');
    error.status = response.status;
    throw error;
  }
  return payload;
};

export const castVote = (electionId, positionId, candidateId, latitude, longitude) =>
  request('/api/vote', { method: 'POST', body: JSON.stringify({ electionId, positionId, candidateId, latitude, longitude }) });

export const publishResults = (id) =>
  request(`/api/admin/election/${id}`, { method: 'PATCH', body: JSON.stringify({ resultsPublished: true }) }, true);

export const fetchPublicResults = (electionId) =>
  request(`/api/election/results/${electionId}`);

export { API_BASE_URL };
