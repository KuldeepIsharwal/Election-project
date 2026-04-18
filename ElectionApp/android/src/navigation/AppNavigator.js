import React, { useContext } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// Import our screens
import LoginScreen from '../screens/LoginScreen';
import VotingScreen from '../screens/VotingScreen';
// import AdminDashboard from '../screens/AdminDashboard'; // We'll build this later

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useContext(AuthContext);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        // User is not logged in
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        // User IS logged in. 
        // Note: Later we will add logic here to check if they are an ADMIN or VOTER 
        // and route them to the correct dashboard.
        <Stack.Screen name="Voting" component={VotingScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;