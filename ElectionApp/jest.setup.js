jest.mock('@react-navigation/native', () => {
  const React = require('react');

  return {
    NavigationContainer: ({ children }) => children,
  };
});

jest.mock('@react-navigation/native-stack', () => {
  const React = require('react');

  return {
    createNativeStackNavigator: () => ({
      Navigator: ({ children }) => children,
      Screen: ({ component: Component }) => <Component />,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  return {
    SafeAreaProvider: ({ children }) => children,
  };
});

jest.mock('@react-native-firebase/auth', () => {
  const authMock = () => ({
    onAuthStateChanged: callback => {
      callback(null);
      return () => {};
    },
    signInWithCredential: jest.fn(),
    signOut: jest.fn(),
  });

  authMock.GoogleAuthProvider = {
    credential: jest.fn(() => ({ provider: 'google' })),
  };

  return authMock;
});

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock('react-native-geolocation-service', () => ({
  getCurrentPosition: jest.fn(),
}));
