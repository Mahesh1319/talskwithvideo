import React from 'react';
import { View, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
// Add this to your App.js
import { firebase } from './src/services/firebase';

console.log("Firebase----->",firebase.app().options); // Should show your config
console.log('Firebase apps:', firebase.apps);
console.log('Default app options:', firebase.app().options);

const App = () => {
  return (
    <AuthProvider>
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </AuthProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
});

export default App;