import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { firestore } from '../services/firebase';
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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // useEffect(() => {
    //     const initializeCall = async () => {
    //         try {
    //             const stream = await WebRTCService.initialize(callId, isFrontCamera);
    //             setLocalStream(stream);

    //             // Listen for remote stream changes
    //             WebRTCService.onRemoteStream((stream) => {
    //                 if (stream) {
    //                     setRemoteStream(stream);
    //                 }
    //             });

    //             const callDoc = firestore().collection('calls').doc(callId);

    //             unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
    //                 const data = doc.data();
    //                 if (!data) return;

    //                 if (data.status === 'connected') {
    //                     setCallStatus('Connected');
    //                 }

    //                 if (data.offer && !isCaller && !WebRTCService.getRemoteStream()) {
    //                     try {
    //                         // Only process offer if we don't have a remote stream yet
    //                         await WebRTCService.setRemoteDescription(data.offer);
    //                         const answer = await WebRTCService.createAnswer();
    //                         await callDoc.update({
    //                             answer: JSON.stringify(answer),
    //                             status: 'connected',
    //                             updatedAt: firestore.FieldValue.serverTimestamp(),
    //                         });
    //                         setCallStatus('Connected');
    //                     } catch (error) {
    //                         console.error('Error handling offer:', error);
    //                     }
    //                 }

    //                 if (data.answer && isCaller && !WebRTCService.getRemoteStream()) {
    //                     try {
    //                         // Only process answer if we don't have a remote stream yet
    //                         await WebRTCService.setRemoteDescription(data.answer);
    //                         setCallStatus('Connected');
    //                     } catch (error) {
    //                         console.error('Error handling answer:', error);
    //                     }
    //                 }

    //                 if (data.iceCandidates) {
    //                     for (const candidate of data.iceCandidates) {
    //                         try {
    //                             await WebRTCService.addICECandidate(candidate);
    //                         } catch (error) {
    //                             console.error('Error adding ICE candidate:', error);
    //                         }
    //                     }
    //                 }
    //             });

    //             if (isCaller) {
    //                 try {
    //                     const offer = await WebRTCService.createOffer();
    //                     await callDoc.update({
    //                         offer: JSON.stringify(offer),
    //                         status: 'waiting',
    //                         updatedAt: firestore.FieldValue.serverTimestamp(),
    //                     });
    //                 } catch (error) {
    //                     console.error('Error creating offer:', error);
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Call initialization error:', error);
    //             Alert.alert('Error', 'Failed to initialize call');
    //             navigation.goBack();
    //         }
    //     };

    //     initializeCall();

    //     return () => {
    //         unsubscribeRef.current && unsubscribeRef.current();
    //         WebRTCService.cleanup();
    //     };
    // }, [callId, isCaller]);


    // useEffect(() => {
    //     const initializeCall = async () => {
    //         try {
    //             const stream = await WebRTCService.initialize(callId, isFrontCamera);
    //             setLocalStream(stream);

    //             // Improved remote stream handling
    //             const remoteStreamListener = WebRTCService.onRemoteStream((stream) => {
    //                 if (stream && stream.getVideoTracks().length > 0) {
    //                     console.log('Received remote stream with video track');
    //                     setRemoteStream(stream);
    //                 } else {
    //                     console.log('Remote stream has no video tracks');
    //                 }
    //             });

    //             const callDoc = firestore().collection('calls').doc(callId);

    //             unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
    //                 const data = doc.data();
    //                 if (!data) return;

    //                 if (data.status === 'connected') {
    //                     setCallStatus('Connected');
    //                 }

    //                 // Handle offer/answer only if we don't have a remote stream yet
    //                 if (!remoteStream) {
    //                     if (data.offer && !isCaller) {
    //                         try {
    //                             await WebRTCService.setRemoteDescription(data.offer);
    //                             const answer = await WebRTCService.createAnswer();
    //                             await callDoc.update({
    //                                 answer: JSON.stringify(answer),
    //                                 status: 'connected',
    //                                 updatedAt: firestore.FieldValue.serverTimestamp(),
    //                             });
    //                             setCallStatus('Connected');
    //                         } catch (error) {
    //                             console.error('Error handling offer:', error);
    //                         }
    //                     }

    //                     if (data.answer && isCaller) {
    //                         try {
    //                             await WebRTCService.setRemoteDescription(data.answer);
    //                             setCallStatus('Connected');
    //                         } catch (error) {
    //                             console.error('Error handling answer:', error);
    //                         }
    //                     }
    //                 }

    //                 // Handle ICE candidates
    //                 if (data.iceCandidates) {
    //                     for (const candidate of data.iceCandidates) {
    //                         try {
    //                             await WebRTCService.addICECandidate(candidate);
    //                         } catch (error) {
    //                             console.error('Error adding ICE candidate:', error);
    //                         }
    //                     }
    //                 }
    //             });

    //             if (isCaller) {
    //                 try {
    //                     const offer = await WebRTCService.createOffer();
    //                     await callDoc.update({
    //                         offer: JSON.stringify(offer),
    //                         status: 'waiting',
    //                         updatedAt: firestore.FieldValue.serverTimestamp(),
    //                     });
    //                 } catch (error) {
    //                     console.error('Error creating offer:', error);
    //                 }
    //             }

    //             return () => {
    //                 remoteStreamListener(); // Clean up the listener
    //             };
    //         } catch (error) {
    //             console.error('Call initialization error:', error);
    //             Alert.alert('Error', 'Failed to initialize call');
    //             navigation.goBack();
    //         }
    //     };

    //     initializeCall();

    //     return () => {
    //         unsubscribeRef.current && unsubscribeRef.current();
    //         WebRTCService.cleanup();
    //     };
    // }, [callId, isCaller]);


    useEffect(() => {
    const initializeCall = async () => {
        try {
            const stream = await WebRTCService.initialize(callId, isFrontCamera);
            setLocalStream(stream);

            // Listen for remote stream
            const unsubscribeRemoteStream = WebRTCService.onRemoteStream((stream) => {
                if (stream && stream.getVideoTracks().length > 0) {
                    setRemoteStream(stream);
                }
            });

            const callDoc = firestore().collection('calls').doc(callId);

            unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
                const data = doc.data();
                if (!data) return;

                // Update call status
                if (data.status === 'connected') {
                    setCallStatus('Connected');
                }

                // Handle offer if we're the callee
                if (data.offer && !isCaller) {
                    try {
                        await WebRTCService.setRemoteDescription(data.offer);
                        const answer = await WebRTCService.createAnswer();
                        await callDoc.update({
                            answer: JSON.stringify(answer),
                            status: 'connected',
                            updatedAt: firestore.FieldValue.serverTimestamp(),
                        });
                    } catch (error) {
                        console.error('Error handling offer:', error);
                    }
                }

                // Handle answer if we're the caller
                if (data.answer && isCaller) {
                    try {
                        await WebRTCService.setRemoteDescription(data.answer);
                    } catch (error) {
                        console.error('Error handling answer:', error);
                    }
                }

                // Handle ICE candidates
                if (data.iceCandidates) {
                    for (const candidate of data.iceCandidates) {
                        try {
                            await WebRTCService.addICECandidate(candidate);
                        } catch (error) {
                            console.error('Error adding ICE candidate:', error);
                        }
                    }
                }
            });

            // Create offer if we're the caller
            if (isCaller) {
                try {
                    const offer = await WebRTCService.createOffer();
                    await callDoc.update({
                        offer: JSON.stringify(offer),
                        status: 'waiting',
                        updatedAt: firestore.FieldValue.serverTimestamp(),
                    });
                } catch (error) {
                    console.error('Error creating offer:', error);
                }
            }

            return () => {
                unsubscribeRemoteStream();
            };
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

            {localStream && isVideoOn && (
                <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.localVideo}
                    objectFit="cover"
                    mirror={isFrontCamera}
                />
            )}

            <View style={styles.statusBar}>
                <Text style={styles.statusText}>{callStatus}</Text>
                {callStatus === 'Connected' && (
                    <Text style={styles.durationText}>{formatTime(callDuration)}</Text>
                )}
            </View>

            <View style={styles.callerInfo}>
                <Text style={styles.callerText}>
                    {isCaller ? calleeEmail : callerEmail}
                </Text>
            </View>

            <View style={styles.controls}>
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