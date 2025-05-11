import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  StatusBar
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { firestore, auth } from '../services/firebase';
import WebRTCService from '../services/WebRTCService';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const CallScreen = ({ route, navigation }) => {
    const { callId, isCaller, callerEmail, calleeEmail } = route.params;
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const [callStatus, setCallStatus] = useState(isCaller ? 'Calling...' : 'Connecting...');
    const unsubscribeRef = useRef(null);
    const intervalRef = useRef(null);

    // Format time for display
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        // Start call timer
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
        const initializeCall = async () => {
            try {
                const stream = await WebRTCService.initialize(callId, isFrontCamera);
                setLocalStream(stream);

                const callDoc = firestore().collection('calls').doc(callId);

                unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
                    const data = doc.data();

                    if (!data) return;

                    // Update call status when connected
                    if (data.status === 'connected') {
                        setCallStatus('Connected');
                    }

                    if (data.offer && !isCaller) {
                        await WebRTCService.setRemoteDescription(data.offer);
                        const answer = await WebRTCService.createAnswer(data.offer);
                        setCallStatus('Connected');
                    }

                    if (data.answer && isCaller) {
                        await WebRTCService.setRemoteDescription(data.answer);
                        setCallStatus('Connected');
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
            } catch (error) {
                console.error('Call initialization error:', error);
                Alert.alert('Error', 'Failed to initialize call');
                navigation.goBack();
            }
        };

        initializeCall();

        return () => {
            unsubscribeRef.current && unsubscribeRef.current();
            WebRTCService.cleanup();
        };
    }, [callId, isCaller]);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('calls')
            .doc(callId)
            .onSnapshot((snapshot) => {
                const data = snapshot.data();

                if (data?.status === 'ended' || data?.status === 'rejected') {
                    WebRTCService.cleanup();
                    navigation.goBack();
                }
            });

        return () => unsubscribe();
    }, [callId]);

    const endCall = async () => {
        try {
            await firestore().collection('calls').doc(callId).update({
                status: 'ended',
                endedAt: firestore.FieldValue.serverTimestamp(),
                duration: callDuration
            });
            WebRTCService.cleanup();
            navigation.goBack();
        } catch (error) {
            console.error('Error ending call:', error);
        }
    };

    const toggleCamera = async () => {
        try {
            const newCameraState = !isFrontCamera;
            await WebRTCService.switchCamera(newCameraState);
            setIsFrontCamera(newCameraState);
        } catch (error) {
            console.error('Error switching camera:', error);
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

    return (
        <View style={styles.container}>
            {/* Remote Video Stream */}
            {remoteStream ? (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    mirror={false}
                />
            ) : (
                <View style={styles.remoteVideoPlaceholder}>
                    <Icon name="user" size={80} color="#fff" />
                    <Text style={styles.placeholderText}>
                        {isCaller ? `Calling ${calleeEmail}` : `Call from ${callerEmail}`}
                    </Text>
                </View>
            )}

            {/* Local Video Stream */}
            {localStream && isVideoOn && (
                <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.localVideo}
                    objectFit="cover"
                    mirror={isFrontCamera}
                />
            )}

            {/* Status Bar */}
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>{callStatus}</Text>
                {callStatus === 'Connected' && (
                    <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
                )}
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfo}>
                <Text style={styles.callerText}>
                    {isCaller ? calleeEmail : callerEmail}
                </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                {/* Camera Toggle */}
                <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={toggleCamera}
                >
                    <Ionicons 
                        name="camera-reverse" 
                        size={30} 
                        color="white" 
                    />
                    <Text style={styles.controlText}>Flip</Text>
                </TouchableOpacity>

                {/* Mute Toggle */}
                <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={toggleMute}
                >
                    <Ionicons 
                        name={isMuted ? "mic-off" : "mic"} 
                        size={30} 
                        color="white" 
                    />
                    <Text style={styles.controlText}>{isMuted ? "Unmute" : "Mute"}</Text>
                </TouchableOpacity>

                {/* Video Toggle */}
                <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={toggleVideo}
                >
                    <Ionicons 
                        name={isVideoOn ? "videocam" : "videocam-off"} 
                        size={30} 
                        color="white" 
                    />
                    <Text style={styles.controlText}>{isVideoOn ? "Video Off" : "Video On"}</Text>
                </TouchableOpacity>

                {/* End Call Button */}
                <TouchableOpacity 
                    style={[styles.controlButton, styles.endCallButton]} 
                    onPress={endCall}
                >
                    <Ionicons 
                        name="call" 
                        size={30} 
                        color="white" 
                    />
                    <Text style={styles.controlText}>End</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
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
        top: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
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
    callerInfo: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 80 : StatusBar.currentHeight + 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    callerText: {
        color: '#fff',
        fontSize: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
    },
    controls: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
    },
    controlButton: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 15,
        borderRadius: 50,
        width: 70,
    },
    endCallButton: {
        backgroundColor: '#ff3b30',
    },
    controlText: {
        color: '#fff',
        marginTop: 5,
        fontSize: 12,
    },
});

export default CallScreen;