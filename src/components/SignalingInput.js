import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

const SignalingInput = ({ value, onChangeText, placeholder }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Signaling Data:</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        editable={!!placeholder}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#495057',
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
    fontSize: 12,
    color: '#333',
  },
});

export default SignalingInput;