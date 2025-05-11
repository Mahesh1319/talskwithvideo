import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions,Button } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { firestore, auth } from '../services/firebase';
import WebRTCService from '../services/WebRTCService';
import Icon from 'react-native-vector-icons/FontAwesome';

const CallScreen = ({ route, navigation }) => {
  const { callId, isCaller } = route.params;
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    (async () => {
      const stream = await WebRTCService.initialize(callId);
      setLocalStream(stream);

      const callDoc = firestore().collection('calls').doc(callId);

      unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
        const data = doc.data();

        if (!data) return;

        if (data.offer && !isCaller) {
          await WebRTCService.setRemoteDescription(data.offer);
          await WebRTCService.createAnswer(data.offer);
        }

        if (data.answer && isCaller) {
          await WebRTCService.setRemoteDescription(data.answer);
        }

        if (data.iceCandidates) {
          for (const candidate of data.iceCandidates) {
            await WebRTCService.addICECandidate(candidate);
          }
        }

        const remote = WebRTCService.getRemoteStream();
        if (remote) {
          setRemoteStream(remote);
        }
      });

      if (isCaller) {
        await WebRTCService.createOffer();
      }
    })();

    return () => {
      unsubscribeRef.current && unsubscribeRef.current();
      WebRTCService.cleanup();
    };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={{ flex: 1, backgroundColor: 'black' }}
        />
      )}
      {remoteStream && (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={{ flex: 1, backgroundColor: 'gray' }}
        />
      )}
      <Button title="End Call" onPress={() => navigation.goBack()} />
    </View>
  );
};

export default CallScreen;