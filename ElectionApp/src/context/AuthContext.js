import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';

const AuthContext = createContext({
  user: null,
  backendStudent: null,
  initializing: true,
  setBackendStudent: () => {},
  clearBackendSession: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [backendStudent, setBackendStudent] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);

      if (!currentUser) {
        setBackendStudent(null);
      }

      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  const clearBackendSession = () => {
    setBackendStudent(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        backendStudent,
        initializing,
        setBackendStudent,
        clearBackendSession,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export { AuthContext };
