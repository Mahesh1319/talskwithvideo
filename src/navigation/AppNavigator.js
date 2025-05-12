import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import CallScreen from '../screens/CallScreen';
import Colours from '../assets/Colours';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user } = useAuth();

  //here we implement the screen navigation functionality
  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ 
                title: 'Video Call App',
                headerBackVisible: false,
                headerTitleAlign: 'center',
                headerTitleStyle: { color: Colours.primary, fontSize: 20, fontWeight: 'bold' }
              }}
            />
            <Stack.Screen
              name="Call"
              component={CallScreen}
              options={{ 
                headerShown: false,
                gestureEnabled: false
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;