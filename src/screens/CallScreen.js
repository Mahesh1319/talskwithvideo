import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { firestore, auth } from '../services/firebase';
import WebRTCService from '../services/WebRTCService';
import Icon from 'react-native-vector-icons/FontAwesome';

const CallScreen = ({ route, navigation }) => {
    const { callId, callerId, calleeId, isCaller, callerEmail, calleeEmail } = route.params;
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [status, setStatus] = useState(isCaller ? 'Calling...' : 'Joining...');
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const webrtc = useRef(null);
    const intervalRef = useRef(null);

    const endCall = async () => {
        try {
            // Update call status
            await firestore()
                .collection('calls')
                .doc(callId)
                .update({
                    status: 'ended',
                    endedAt: firestore.FieldValue.serverTimestamp(),
                    duration: callDuration
                });

            // Clean up WebRTC
            if (webrtc.current) {
                webrtc.current.cleanup();
            }

            // Navigate back
            navigation.goBack();
        } catch (err) {
            console.error('Error ending call:', err);
        }
    };

    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            const videoTracks = localStream.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOn(!isVideoOn);
        }
    };

    useEffect(() => {
        // Start timer
        intervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        webrtc.current = WebRTCService;

        const initializeCall = async () => {
            try {
                // Initialize WebRTC
                const stream = await webrtc.current.initialize(callId, callerId, calleeId, isCaller);
                setLocalStream(stream);

                // Listen for remote stream
                const remoteInterval = setInterval(() => {
                    if (webrtc.current.remoteStream) {
                        setRemoteStream(webrtc.current.remoteStream);
                        setStatus('Connected');
                    }
                }, 1000);

                // Caller creates offer
                if (isCaller) {
                    await webrtc.current.createOffer();
                }

                // Listen for call updates
                const unsubscribe = firestore()
                    .collection('calls')
                    .doc(callId)
                    .onSnapshot(async (doc) => {
                        const data = doc.data();

                        // Check if call was rejected or ended
                        if (data?.status === 'rejected') {
                            Alert.alert('Call Rejected', 'The other user rejected your call', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                            return;
                        }

                        if (data?.status === 'ended') {
                            Alert.alert('Call Ended', 'The other user has ended the call', [
                                { text: 'OK', onPress: () => navigation.goBack() }
                            ]);
                            return;
                        }

                        // Callee handles offer
                        if (!isCaller && data.offer) {
                            await webrtc.current.createAnswer(data.offer);
                        }

                        // Handle ICE candidates
                        if (data.iceCandidates) {
                            data.iceCandidates.forEach(candidate => {
                                webrtc.current.addICECandidate(candidate);
                            });
                        }
                    });

                return () => {
                    clearInterval(remoteInterval);
                    unsubscribe();
                };
            } catch (err) {
                console.error('Call failed:', err);
                Alert.alert('Call Error', err.message);
                navigation.goBack();
            }
        };

        initializeCall();

        return () => {
            if (webrtc.current) {
                webrtc.current.cleanup();
            }
        };
    }, [callId, callerId, calleeId, isCaller, navigation]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <View style={styles.container}>
            {remoteStream ? (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                />
            ) : (
                <View style={styles.remoteVideoPlaceholder}>
                    <Icon name="user" size={100} color="#666" />
                    <Text style={styles.placeholderText}>
                        {isCaller ? `Calling ${calleeEmail}` : `Call from ${callerEmail}`}
                    </Text>
                </View>
            )}

            {localStream && (
                <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.localVideo}
                    objectFit="cover"
                    mirror={true}
                />
            )}

            <View style={styles.statusBar}>
                <Text style={styles.statusText}>{status}</Text>
                {status === 'Connected' && (
                    <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
                )}
            </View>

            <View style={styles.controls}>
                <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
                    <Icon name={isMuted ? "microphone-slash" : "microphone"} size={30} color="white" />
                    <Text style={styles.controlText}>{isMuted ? "Unmute" : "Mute"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.controlButton, { backgroundColor: '#ff3b30' }]} 
                    onPress={endCall}
                >
                    <Icon name="phone" size={30} color="white" />
                    <Text style={styles.controlText}>End</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
                    <Icon name={isVideoOn ? "video" : "video-slash"} size={30} color="white" />
                    <Text style={styles.controlText}>{isVideoOn ? "Video Off" : "Video On"}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    remoteVideo: {
        flex: 1,
    },
    remoteVideoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#222',
    },
    placeholderText: {
        color: '#fff',
        marginTop: 20,
        fontSize: 18,
    },
    localVideo: {
        position: 'absolute',
        width: 100,
        height: 150,
        bottom: 150,
        right: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fff',
    },
    statusBar: {
        position: 'absolute',
        top: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
    },
    durationText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 5,
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    controlButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 15,
        borderRadius: 50,
        width: 80,
    },
    controlText: {
        color: '#fff',
        marginTop: 5,
        fontSize: 12,
    },
});

export default CallScreen;