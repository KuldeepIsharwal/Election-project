import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { clearTokens } from '../services/api';
import LoginScreen from '../screens/LoginScreen';
import VotingScreen from '../screens/VotingScreen';
import AdminDashboard from '../screens/AdminDashboard';
import AdminPinScreen from '../screens/AdminPinScreen';
import ApplyScreen from '../screens/ApplyScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useAuth();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Voting" component={VotingScreen} />
          <Stack.Screen name="Apply" component={ApplyScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="AdminPin" component={AdminPinScreen} />
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboard}
            options={({ navigation }) => ({
              headerShown: true,
              headerTitle: 'Admin Panel',
              headerBackVisible: false,
              headerRight: () => (
                <TouchableOpacity
                  onPress={() => {
                    clearTokens();
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  }}
                  style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>
                    Logout
                  </Text>
                </TouchableOpacity>
              ),
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;