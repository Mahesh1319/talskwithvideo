import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

//here we create a Custom Snackbar
const Snackbar = ({ visible, message, onDismiss, duration = 3000 }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-dismiss
      const timer = setTimeout(() => {
        onDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Slide out
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.snackbar}>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.action}>CLOSE</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    width,
    alignItems: 'center',
    zIndex: 1000,
  },
  snackbar: {
    backgroundColor: '#323232',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: '80%',
    justifyContent: 'space-between',
  },
  message: {
    color: '#fff',
    flex: 1,
  },
  action: {
    color: '#BB86FC',
    marginLeft: 12,
    fontWeight: 'bold',
  },
});

export default Snackbar;
