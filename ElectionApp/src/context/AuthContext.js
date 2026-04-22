import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import { setAuthToken, clearTokens } from '../services/api';

const AuthContext = createContext({
  user: null,
  backendStudent: null,
  initializing: true,
  setBackendStudent: () => {},
  clearBackendSession: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [backendStudent, setBackendStudentRaw] = useState(null);
  const [initializing, setInitializing] = useState(true);

  const setBackendStudent = data => {
    if (data?.token) {
      setAuthToken(data.token);
      setBackendStudentRaw(data.student ?? data);
    } else {
      setBackendStudentRaw(data);
    }
  };

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        setBackendStudentRaw(null);
        clearTokens();
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const clearBackendSession = () => {
    setBackendStudentRaw(null);
    clearTokens();
  };

  return (
    <AuthContext.Provider value={{ user, backendStudent, initializing, setBackendStudent, clearBackendSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { AuthContext };