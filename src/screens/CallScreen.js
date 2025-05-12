//CallScreen.js
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
import styles from '../assets/callerStyle';

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
    const remoteStreamListenerRef = useRef(null);

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

    useEffect(() => {
        const initializeCall = async () => {
            try {
                const stream = await WebRTCService.initialize(callId, isFrontCamera);
                setLocalStream(stream);

                remoteStreamListenerRef.current = WebRTCService.onRemoteStream((stream) => {
                    if (stream && stream.getVideoTracks().length > 0) {
                        setRemoteStream(stream);
                    }
                });

                const callDoc = firestore().collection('calls').doc(callId);

                unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
                    const data = doc.data();
                    if (!data) return;

                    if (data.status === 'connected') {
                        setCallStatus('Connected');
                    }

                    if (data.offer && !isCaller) {
                        try {
                            await WebRTCService.setRemoteDescription(data.offer);
                            const answer = await WebRTCService.createAnswer();
                            await callDoc.update({
                                answer: JSON.stringify(answer),
                                status: 'connected',
                                updatedAt: firestore.FieldValue.serverTimestamp(),
                            });
                            setCallStatus('Connected');
                        } catch (error) {
                            console.error('Error handling offer:', error);
                            await callDoc.update({
                                status: 'failed',
                                error: error.message,
                                updatedAt: firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }

                    if (data.answer && isCaller) {
                        try {
                            await WebRTCService.setRemoteDescription(data.answer);
                            setCallStatus('Connected');
                        } catch (error) {
                            console.error('Error handling answer:', error);
                        }
                    }

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
            } catch (error) {
                console.error('Call initialization error:', error);
                Alert.alert('Error', 'Failed to initialize call');
                if (navigation.canGoBack()) {
                    navigation.goBack();
                }
            }
        };

        initializeCall();

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            if (remoteStreamListenerRef.current) {
                remoteStreamListenerRef.current();
            }
            WebRTCService.cleanup();
        };
    }, [callId, isCaller, navigation]);

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('calls')
            .doc(callId)
            .onSnapshot((snapshot) => {
                const data = snapshot.data();
                if (data?.status === 'ended' || data?.status === 'rejected') {
                    WebRTCService.cleanup();
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    }
                }
            });

        return () => unsubscribe();
    }, [callId, navigation]);

    const endCall = async () => {
        try {
            await firestore().collection('calls').doc(callId).update({
                status: 'ended',
                endedAt: firestore.FieldValue.serverTimestamp(),
                duration: callDuration
            });
            WebRTCService.cleanup();
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
        } catch (error) {
            console.error('Error ending call:', error);
            WebRTCService.cleanup();
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
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
            {/* Remote Video - Full Screen */}
            {remoteStream ? (
                <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                    mirror={false}
                    zOrder={0}
                />
            ) : (
                <View style={styles.remoteVideoPlaceholder}>
                    <Icon name="user" size={80} color="#fff" />
                    <Text style={styles.placeholderText}>
                        {isCaller ? `Calling ${calleeEmail}` : `Call from ${callerEmail}`}
                    </Text>
                </View>
            )}

            {/* Local Video - Small Preview (only when video is on) */}
            {isVideoOn && localStream && (
                <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.localVideo}
                    objectFit="cover"
                    mirror={isFrontCamera}
                    zOrder={1}
                />
            )}

            {/* Status Bar */}
            <View style={styles.statusBar}>
                <Text style={styles.statusText}>{callStatus}</Text>
                {callStatus === 'Connected' && (
                    <Text style={[styles.durationText]}>{formatTime(callDuration)}</Text>
                )}
            </View>

            {/* Caller Info */}
            <View style={styles.callerInfo}>
                <Text style={[styles.callerText,{top:20}]}>
                    {isCaller ? calleeEmail : callerEmail}
                </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                <TouchableOpacity 
                    style={styles.controlButton} 
                    onPress={toggleCamera}
                >
                    <Ionicons 
                        name="camera-reverse" 
                        size={26} 
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
                        size={26} 
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
                        size={26} 
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



export default CallScreen;
