import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import VotingScreen from '../screens/VotingScreen';
import AdminDashboard from '../screens/AdminDashboard';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase().includes('admin');

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : isAdmin ? (
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      ) : (
        <Stack.Screen name="Voting" component={VotingScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
