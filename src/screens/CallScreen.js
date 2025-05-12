import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
    Alert,
    PermissionsAndroid
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
    const remoteStreamListenerRef = useRef(null);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };


    //Persmision for accesing camera and mic
    const requestPermissions = async () => {
        if (Platform.OS === 'android') {
            try {
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                ]);

                if (
                    grants['android.permission.CAMERA'] !== PermissionsAndroid.RESULTS.GRANTED ||
                    grants['android.permission.RECORD_AUDIO'] !== PermissionsAndroid.RESULTS.GRANTED
                ) {
                    Alert.alert('Permissions required', 'Camera and microphone permissions are needed to make calls');
                    navigation.goBack();
                    return false;
                }
                return true;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    //To set the call duration
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


    //To initialize the call
    useEffect(() => {
        const initializeCall = async () => {
            const hasPermissions = await requestPermissions();
            if (!hasPermissions) return;

            try {
                const stream = await WebRTCService.initialize(callId, isCaller);
                setLocalStream(stream);

                remoteStreamListenerRef.current = WebRTCService.onRemoteStream((stream) => {
                    console.log('Remote stream received in CallScreen');
                    if (stream && stream.getVideoTracks().length > 0) {
                        console.log('Remote stream has video tracks');
                        setRemoteStream(stream);
                    } else {
                        console.log('Remote stream has no video tracks');
                    }
                });

                const callDoc = firestore().collection('calls').doc(callId);

                unsubscribeRef.current = callDoc.onSnapshot(async (doc) => {
                    const data = doc.data();
                    if (!data) return;

                    console.log('Call document updated:', data);

                    if (data.status === 'connected') {
                        setCallStatus('Connected');
                    }

                    if (data.status === 'ended' || data.status === 'rejected') {
                        WebRTCService.cleanup();
                        navigation.goBack();
                        return;
                    }

                    if (data.offer && !isCaller) {
                        try {
                            console.log('Received offer, setting remote description');
                            await WebRTCService.setRemoteDescription(data.offer);
                            const answer = await WebRTCService.createAnswer();
                            console.log('Created answer, updating call document');
                            await callDoc.update({
                                answer: JSON.stringify(answer),
                                status: 'connected',
                                updatedAt: firestore.FieldValue.serverTimestamp(),
                            });
                            setCallStatus('Connected');
                        } catch (error) {
                            console.log('Error handling offer:', error);
                            await callDoc.update({
                                status: 'failed',
                                error: error.message,
                                updatedAt: firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }

                    if (data.answer && isCaller) {
                        try {
                            console.log('Received answer, setting remote description');
                            await WebRTCService.setRemoteDescription(data.answer);
                            setCallStatus('Connected');
                        } catch (error) {
                            console.error('Error handling answer:', error);
                        }
                    }

                    if (data.iceCandidates) {
                        console.log('Processing ICE candidates:', data.iceCandidates.length);
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
                        console.log('Creating offer as caller');
                        const offer = await WebRTCService.createOffer();
                        console.log('Offer created, updating call document');
                        await callDoc.update({
                            offer: JSON.stringify(offer),
                            status: 'waiting',
                            updatedAt: firestore.FieldValue.serverTimestamp(),
                        });
                    } catch (error) {
                        console.error('Error creating offer:', error);
                        Alert.alert('Error', 'Failed to start call');
                        navigation.goBack();
                    }
                }
            } catch (error) {
                console.error('Call initialization error:', error);
                Alert.alert('Error', 'Failed to initialize call');
                navigation.goBack();
            }
        };

        initializeCall();

        return () => {
            console.log('Cleaning up CallScreen');
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            if (remoteStreamListenerRef.current) {
                remoteStreamListenerRef.current();
            }
            WebRTCService.cleanup();
        };
    }, [callId, isCaller, navigation]);


    //Function to end the call
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
            WebRTCService.cleanup();
            navigation.goBack();
        }
    };


    //function to Switch the camera
    const toggleCamera = async () => {
        try {
            const newCameraState = !isFrontCamera;
            await WebRTCService.switchCamera(newCameraState);
            setIsFrontCamera(newCameraState);
        } catch (error) {
            console.error('Error switching camera:', error);
            Alert.alert('Error', 'Failed to switch camera');
        }
    };


    //function to mute the call
    const toggleMute = () => {
        if (localStream) {
            const audioTracks = localStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    //function to pause the camera
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    remoteVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        fontSize: 16,
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
        width: 80,
        height: 80,
    },
    endCallButton: {
        backgroundColor: '#ff3b30',
    },
    controlText: {
        color: '#fff',
        marginTop: 5,
        fontSize: 10,
    },
});

export default CallScreen;