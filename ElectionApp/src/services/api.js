const API_BASE_URL = 'http://localhost:4000';

const parseJsonSafely = async response => {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
};

const request = async (path, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
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

export const loginUser = idToken => {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
};

export const fetchCandidates = () => {
  return request('/api/candidates');
};

export const submitVote = (studentId, candidateId) => {
  return request('/api/vote', {
    method: 'POST',
    body: JSON.stringify({ studentId, candidateId }),
  });
};

export const fetchAdminResults = () => {
  return request('/api/admin/results');
};

export { API_BASE_URL };
