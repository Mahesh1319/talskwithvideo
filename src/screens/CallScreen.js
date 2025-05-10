import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Clipboard } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { firestore, auth } from '../services/firebase';
import WebRTCService from '../services/WebRTCService';
import CallControls from '../components/CallControls';
import SignalingInput from '../components/SignalingInput';

const CallScreen = ({ route, navigation }) => {
  const { callId, isCaller } = route.params;
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [callStatus, setCallStatus] = useState(isCaller ? 'Ready to start' : 'Ready to join');
  const [signalingData, setSignalingData] = useState('');
  const [activePeer, setActivePeer] = useState(null);
  const webrtc = useRef(WebRTCService);

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Get local media stream
        const stream = await webrtc.current.initLocalStream();
        setLocalStream(stream);
        
        // Set current call ID
        webrtc.current.currentCallId = callId;
        
        // Listen for remote stream updates
        webrtc.current.remoteStreams = [];
        const interval = setInterval(() => {
          if (webrtc.current.remoteStreams.length !== remoteStreams.length) {
            setRemoteStreams([...webrtc.current.remoteStreams]);
          }
        }, 1000);

        // If caller, automatically set as active peer
        if (isCaller) {
          setActivePeer(`participant_${Date.now()}`);
        }

        return () => clearInterval(interval);
      } catch (err) {
        console.error('Call initialization failed:', err);
        setCallStatus('Initialization failed');
      }
    };

    initializeCall();

    return () => {
      webrtc.current.cleanup();
    };
  }, [callId, isCaller]);

  // Start call as broadcaster
  const handleStartCall = async () => {
    try {
      setCallStatus('Creating offer...');
      const offer = await webrtc.current.startCall(activePeer);
      setSignalingData(JSON.stringify(offer));
      setCallStatus('Offer created - ready to connect');
    } catch (err) {
      console.error('Error starting call:', err);
      setCallStatus('Error starting call');
    }
  };

  // Join call as participant
  const handleJoinCall = async () => {
    try {
      if (!signalingData) {
        throw new Error('No offer data to join with');
      }
      
      setCallStatus('Creating answer...');
      const answer = await webrtc.current.joinCall(activePeer, signalingData);
      setSignalingData(JSON.stringify(answer));
      setCallStatus('Connected');
    } catch (err) {
      console.error('Error joining call:', err);
      setCallStatus('Error joining call');
    }
  };

  // Hang up call
  const handleHangUp = async () => {
    try {
      await webrtc.current.hangUp(activePeer);
      setCallStatus('Call ended');
      setRemoteStreams([]);
      navigation.goBack();
    } catch (err) {
      console.error('Error hanging up:', err);
    }
  };

  // Copy offer/answer to clipboard
  const handleCopyOffer = () => {
    Clipboard.setString(signalingData);
    alert('Copied to clipboard!');
  };

  // Paste offer from clipboard
  const handlePasteOffer = async () => {
    const text = await Clipboard.getString();
    setSignalingData(text);
  };

  return (
    <View style={styles.container}>
      {/* Video Streams */}
      <ScrollView contentContainerStyle={styles.streamsContainer}>
        {/* Local Stream */}
        {localStream && (
          <View style={styles.streamWrapper}>
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.stream}
              objectFit="cover"
              mirror={true}
            />
            <Text style={styles.streamLabel}>You</Text>
          </View>
        )}

        {/* Remote Streams */}
        {remoteStreams.map((stream, index) => (
          <View key={index} style={styles.streamWrapper}>
            <RTCView
              streamURL={stream.toURL()}
              style={styles.stream}
              objectFit="cover"
            />
            <Text style={styles.streamLabel}>Participant {index + 1}</Text>
          </View>
        ))}

        {/* Instructions */}
        {remoteStreams.length === 0 && (
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>How to connect:</Text>
            {isCaller ? (
              <>
                <Text style={styles.instructionText}>1. Click "Start Call"</Text>
                <Text style={styles.instructionText}>2. Copy the offer and send it</Text>
                <Text style={styles.instructionText}>3. Wait for participant to join</Text>
              </>
            ) : (
              <>
                <Text style={styles.instructionText}>1. Paste the offer you received</Text>
                <Text style={styles.instructionText}>2. Click "Join Call"</Text>
                <Text style={styles.instructionText}>3. Send the answer back</Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Signaling Data Input */}
      <SignalingInput
        value={signalingData}
        onChangeText={setSignalingData}
        placeholder={isCaller ? "Offer will appear here..." : "Paste offer here..."}
      />

      {/* Call Controls */}
      <CallControls
        onStartCall={handleStartCall}
        onJoinCall={handleJoinCall}
        onHangUp={handleHangUp}
        onCopyOffer={handleCopyOffer}
        onPasteOffer={handlePasteOffer}
        callStatus={callStatus}
        localStream={localStream}
        isCaller={isCaller}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  streamsContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 10,
  },
  streamWrapper: {
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#555',
    borderRadius: 5,
    overflow: 'hidden',
  },
  stream: {
    width: '100%',
    height: 200,
    backgroundColor: '#222',
  },
  streamLabel: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    padding: 3,
    borderRadius: 3,
  },
  instructions: {
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    marginTop: 20,
  },
  instructionTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionText: {
    color: 'white',
    marginBottom: 5,
  },
});

export default CallScreen;