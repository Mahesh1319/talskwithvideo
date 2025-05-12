import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Clipboard, Modal, Image } from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Snackbar from 'react-native-snackbar';
import Styles from '../assets/Styles';
import Colours from '../assets/Colours';

const HomeScreen = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [callId, setCallId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clipboardContent, setClipboardContent] = useState('');
    const callIdInputRef = useRef(null);
    const [incomingCallVisible, setIncomingCallVisible] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const [incomingCallId, setIncomingCallId] = useState(null);
    const [isCallInitiator, setIsCallInitiator] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const currentUser = auth().currentUser;
            if (!currentUser) {
                setError('Not authenticated. Please login again.');
                setLoading(false);
                return;
            }

            const unsubscribe = firestore()
                .collection('users')
                .where('uid', '!=', currentUser.uid)
                .onSnapshot(
                    (querySnapshot) => {
                        try {
                            if (!querySnapshot) {
                                throw new Error('No snapshot returned');
                            }

                            const usersList = [];
                            querySnapshot.forEach((doc) => {
                                if (doc.exists) {
                                    usersList.push({
                                        id: doc.id,
                                        ...doc.data()
                                    });
                                }
                            });
                            setUsers(usersList);
                            setError(null);
                        } catch (err) {
                            console.error("Snapshot error:", err);
                            setError(err.message);
                        } finally {
                            setLoading(false);
                        }
                    },
                    (err) => {
                        console.error("Firestore error:", err);
                        setError(err.message);
                        setLoading(false);
                    }
                );

            return () => unsubscribe();
        } catch (err) {
            console.error("Initialization error:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        // Listen for incoming calls
        const unsubscribe = firestore()
            .collection('calls')
            .where('calleeId', '==', currentUser.uid)
            .where('status', '==', 'calling')
            .onSnapshot(
                (snapshot) => {
                    snapshot?.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const callData = change.doc.data();
                            console.log('Incoming call detected:', callData);
                            showIncomingCallAlert(change.doc.id, callData);
                        }
                    });
                },
                (error) => {
                    console.error('Call listener error:', error);
                    Alert.alert('Error', 'Failed to listen for calls');
                }
            );

        return () => unsubscribe();
    }, []);

    const showIncomingCallAlert = (callId, callData) => {
        setIncomingCallId(callId);
        setIncomingCallData(callData);
        setIncomingCallVisible(true);
    };

    const handleAccept = () => {
        if (incomingCallId && incomingCallData) {
            acceptCall(incomingCallId, incomingCallData);
        }
        setIncomingCallVisible(false);
    };

    const handleReject = () => {
        if (incomingCallId) {
            rejectCall(incomingCallId);
        }
        setIncomingCallVisible(false);
    };

    const rejectCall = async (callId) => {
        try {
            await firestore()
                .collection('calls')
                .doc(callId)
                .update({
                    status: 'rejected',
                    updatedAt: firestore.FieldValue.serverTimestamp()
                });
            Snackbar.show({
                text: 'Call Rejected',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        } catch (err) {
            console.error('Error rejecting call:', err);
            Alert.alert('Error', 'Failed to reject call');
        }
    };

    const acceptCall = async (callId, callData) => {
        try {
            // Update call status
            await firestore()
                .collection('calls')
                .doc(callId)
                .update({
                    status: 'accepted',
                    updatedAt: firestore.FieldValue.serverTimestamp()
                });

            // Navigate to call screen
            navigation.navigate('Call', {
                callId,
                callerId: callData.callerId,
                calleeId: auth().currentUser.uid,
                isCaller: false,
                callerEmail: callData.callerEmail,
                calleeEmail: auth().currentUser.email
            });
        } catch (err) {
            console.error('Error accepting call:', err);
            Alert.alert('Error', 'Failed to accept call');
        }
    };

    const initiateCall = async () => {
        if (!callId.trim()) {
            Snackbar.show({
                text: 'Please enter a call ID',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
            return;
        }

        try {
            const currentUser = auth().currentUser;
            if (!currentUser) throw new Error("Not authenticated");

            // Check if call already exists
            const callDoc = await firestore().collection('calls').doc(callId).get();

            if (callDoc.exists) {
                const callData = callDoc.data();
            
                if (!callData) {
                    throw new Error('Call data is undefined');
                }
            
                if (callData.status === 'ended') {
                    throw new Error('This call has already ended');
                }
            
                if (callData.callerId === currentUser.uid) {
                    throw new Error('You cannot join your own call as a participant');
                }
            
                navigation.navigate('Call', {
                    callId,
                    callerId: callData.callerId,
                    calleeId: currentUser.uid,
                    isCaller: false,
                    callerEmail: callData.callerEmail,
                    calleeEmail: currentUser.email
                });
            }  else {
                // Create new call
                const callDocRef = firestore().collection('calls').doc(callId);
                const callData = {
                    callerId: currentUser.uid,
                    callerEmail: currentUser.email,
                    callId: callId,
                    status: 'waiting',
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    updatedAt: firestore.FieldValue.serverTimestamp()
                };

                await callDocRef.set(callData);
                setIsCallInitiator(true);

                // Navigate to call screen as initiator
                navigation.navigate('Call', {
                    callId,
                    isCaller: true,
                    callerEmail: currentUser.email,
                    calleeEmail: '' // Will be filled when someone joins
                });
            }
        } catch (err) {
            console.log("Call initiation error:", err);
            Snackbar.show({
                text: 'Call initiation error:'+err,
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        }
    };

    const copyCallId = () => {
        const currentUserId = auth().currentUser?.uid;
        if (!currentUserId) return;
        
        Clipboard.setString(currentUserId);
        Snackbar.show({
            text: 'Your ID copied to clipboard',
            duration: Snackbar.LENGTH_SHORT,
            backgroundColor: Colours.secondary,
            textColor: Colours.white,
            marginBottom: 10
        });
    };

    const pasteCallId = async () => {
        try {
            const content = await Clipboard.getString();
            if (content) {
                setCallId(content);
                if (callIdInputRef.current) {
                    callIdInputRef.current.focus();
                }
            }
        } catch (err) {
            console.error('Failed to paste:', err);
        }
    };

    const handleRetry = () => {
        setError(null);
        setLoading(true);
        fetchUsers();
    };

    const handleSignOut = async () => {
        try {
            await auth().signOut();
        } catch (err) {
            console.error("Sign out error:", err);
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <View style={[Styles.container, Styles.center]}>
                <ActivityIndicator size="large" color="#4285f4" />
                <Text style={Styles.loadingText}>Loading users...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[Styles.container, Styles.center]}>
                <Text style={Styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={Styles.retryButton}
                    onPress={handleRetry}
                >
                    <Text style={Styles.buttonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[Styles.retryButton, { backgroundColor: '#db4437', marginTop: 10 }]}
                    onPress={handleSignOut}
                >
                    <Text style={Styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderIncomingCall = () => (
        <Modal
            visible={incomingCallVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setIncomingCallVisible(false)}
        >
            <View style={Styles.modalOverlay}>
                <View style={Styles.modalContainer}>
                    <Ionicons name="person-circle" size={150} color={Colours.primary} />
                    <Text style={Styles.callerHeading}>
                        Incoming Call from
                    </Text>
                    <Text style={Styles.callerText}>
                        {incomingCallData?.callerEmail || 'Unknown'}
                    </Text>
                    <View style={Styles.callButtonContainer}>
                        <TouchableOpacity style={Styles.rejectButton} onPress={handleReject}>
                            <Text style={Styles.buttonText}>Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={Styles.acceptButton} onPress={handleAccept}>
                            <Text style={Styles.buttonText}>Attend</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={Styles.container}>
            <Text style={Styles.title}>Welcome, {auth().currentUser?.email}</Text>

            <View style={Styles.callContainer}>
                <TextInput
                    ref={callIdInputRef}
                    style={[Styles.inputContainer, { flex: 1, height: 50, alignSelf: 'center' }]}
                    placeholder="Enter Call ID"
                    value={callId}
                    onChangeText={setCallId}
                    placeholderTextColor="#999"
                />
                <View style={Styles.callIdButtons}>
                    <TouchableOpacity style={Styles.smallButton} onPress={copyCallId}>
                        <Icon name="copy" size={16} color={Colours.white} />
                        <Text style={Styles.smallText}>Copy ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={Styles.smallButton} onPress={pasteCallId}>
                        <Icon name="paste" size={16} color={Colours.white} />
                        <Text style={Styles.smallText}>Paste</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={Styles.joinButton}
                    onPress={initiateCall}
                    disabled={loading}
                >
                    <Text style={Styles.buttonText}>{isCallInitiator ? 'Start Call' : 'Join Call'}</Text>
                </TouchableOpacity>
            </View>

            <Text style={Styles.subtitle}>Available Users</Text>

            {users.length === 0 ? (
                <Text style={Styles.noUsersText}>No other users available</Text>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.uid}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={Styles.userItem}
                            onPress={() => {
                                setCallId(item.uid);
                                initiateCall();
                            }}
                            disabled={loading}
                        >
                            <Icon name="user" size={20} color={Colours.primary} style={Styles.userIcon} />
                            <Text style={Styles.userText}>{item.email}</Text>
                            <Icon name="video-camera" size={20} color={Colours.primary} style={Styles.callIcon} />
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity
                style={Styles.logoutButton}
                onPress={handleSignOut}
                disabled={loading}
            >
                <Text style={Styles.buttonText}>Logout</Text>
            </TouchableOpacity>
            {renderIncomingCall()}
        </View>
    );
};

export default HomeScreen;