import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import styles from '../assets/callControlStyle';


//here we create the call controll buttons
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


export default CallControls;