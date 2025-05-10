import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';

const CallControls = ({
  onStartCall,
  onJoinCall,
  onHangUp,
  onCopyOffer,
  onPasteOffer,
  callStatus,
  localStream,
}) => {
  return (
    <View style={styles.container}>
      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Status: {callStatus || 'Not connected'}
        </Text>
        <Text style={styles.streamStatus}>
          Local stream: {localStream ? '✅' : '❌'}
        </Text>
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={onStartCall}
        >
          <Icon name="phone" size={20} color="white" />
          <Text style={styles.buttonText}>Start Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.joinButton]}
          onPress={onJoinCall}
        >
          <Icon name="sign-in" size={20} color="white" />
          <Text style={styles.buttonText}>Join Call</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.copyButton]}
          onPress={onCopyOffer}
        >
          <Icon name="copy" size={20} color="white" />
          <Text style={styles.buttonText}>Copy Offer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.pasteButton]}
          onPress={onPasteOffer}
        >
          <Icon name="paste" size={20} color="white" />
          <Text style={styles.buttonText}>Paste Offer</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, styles.hangupButton]}
        onPress={onHangUp}
      >
        <Icon name="phone" size={20} color="white" />
        <Text style={styles.buttonText}>Hang Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  statusContainer: {
    marginBottom: 15,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
  },
  streamStatus: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 5,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  startButton: {
    backgroundColor: '#28a745',
  },
  joinButton: {
    backgroundColor: '#17a2b8',
  },
  copyButton: {
    backgroundColor: '#ffc107',
  },
  pasteButton: {
    backgroundColor: '#fd7e14',
  },
  hangupButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default CallControls;