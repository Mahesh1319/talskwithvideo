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
    const [myCallId, setMyCallId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clipboardContent, setClipboardContent] = useState('');
    const callIdInputRef = useRef(null);
    const myCallIdInputRef = useRef(null);
    const [incomingCallVisible, setIncomingCallVisible] = useState(false);
    const [incomingCallData, setIncomingCallData] = useState(null);
    const [incomingCallId, setIncomingCallId] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const currentUser = auth().currentUser;
                if (!currentUser) {
                    setError('Not authenticated. Please login again.');
                    setLoading(false);
                    return;
                }

                // Set current user's UID as default call ID
                setMyCallId(currentUser.uid);

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

        fetchUsers();
    }, []);

    useEffect(() => {
        const currentUser = auth().currentUser;
        if (!currentUser) return;

        // Listen for calls where current user is the callee
        const unsubscribe = firestore()
            .collection('calls')
            .where('calleeId', '==', currentUser.uid)
            .where('status', '==', 'calling')
            .onSnapshot(
                (snapshot) => {
                    if (!snapshot) return;
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            const callData = change.doc.data();
                            showIncomingCallAlert(change.doc.id, callData);
                        }
                    });
                },
                (error) => {
                    console.error('Error listening for calls:', error);
                    setError(error.message);
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
                isGroupCall: callData.isGroupCall || false,
                participants: callData.participants || []
            });
        } catch (err) {
            console.error('Error accepting call:', err);
            Alert.alert('Error', 'Failed to accept call');
        }
    };

    // Existing one-to-one call function
    const startCall = async (calleeId, calleeEmail) => {
        try {
            const callerId = auth().currentUser.uid;
            const callerEmail = auth().currentUser.email;
            const callDoc = firestore().collection('calls').doc();

            await callDoc.set({
                callerId,
                callerEmail,
                calleeId,
                calleeEmail,
                callId: callDoc.id,
                status: 'calling',
                participants: [callerId, calleeId],
                iceCandidates: [],
                createdAt: firestore.FieldValue.serverTimestamp(),
                isGroupCall: false
            });

            navigation.navigate('Call', {
                callId: callDoc.id,
                callerId,
                calleeId,
                isCaller: true,
                calleeEmail,
                isGroupCall: false,
                participants: [callerId, calleeId]
            });
        } catch (err) {
            console.error('Call failed:', err);
            Alert.alert('Error', 'Failed to start call: ' + err.message);
        }
    };

    // New function to create a group call
    const createGroupCall = async () => {
        try {
            const currentUser = auth().currentUser;
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            const callDoc = firestore().collection('calls').doc(myCallId);

            await callDoc.set({
                callerId: currentUser.uid,
                callerEmail: currentUser.email,
                callId: myCallId,
                status: 'waiting',
                participants: [currentUser.uid],
                iceCandidates: [],
                createdAt: firestore.FieldValue.serverTimestamp(),
                isGroupCall: true
            });

            Snackbar.show({
                text: 'Group call created. Share your call ID with others.',
                duration: Snackbar.LENGTH_LONG,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });

            navigation.navigate('Call', {
                callId: myCallId,
                callerId: currentUser.uid,
                isCaller: true,
                isGroupCall: true,
                participants: [currentUser.uid]
            });
        } catch (err) {
            console.error('Failed to create group call:', err);
            Snackbar.show({
                text: 'Failed to create call: ' + err.message,
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        }
    };

    // New function to join a group call
    const joinGroupCall = async () => {
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
            if (!currentUser) {
                throw new Error('Not authenticated');
            }

            const callDoc = firestore().collection('calls').doc(callId);
            const callSnapshot = await callDoc.get();

            if (!callSnapshot.exists) {
                throw new Error('Call not found');
            }

            const callData = callSnapshot.data();

            if (callData.status === 'ended') {
                throw new Error('This call has already ended');
            }

            // Add current user to participants list
            await callDoc.update({
                participants: firestore.FieldValue.arrayUnion(currentUser.uid),
                updatedAt: firestore.FieldValue.serverTimestamp()
            });

            navigation.navigate('Call', {
                callId,
                callerId: callData.callerId,
                isCaller: false,
                isGroupCall: true,
                participants: [...callData.participants, currentUser.uid],
                callerEmail: callData.callerEmail
            });
        } catch (err) {
            Snackbar.show({
                text: err.message,
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        }
    };

    const copyMyCallId = () => {
        Clipboard.setString(myCallId);
        Snackbar.show({
            text: 'Call ID copied to clipboard',
            duration: Snackbar.LENGTH_SHORT,
            backgroundColor: Colours.snackBar,
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
        useEffect(() => fetchUsers(), []);
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

            {/* My Call ID Section */}
            <View style={[Styles.callContainer, { flexDirection: 'column' }]}>
                <Text style={Styles.sectionLabel}>Your Call ID:</Text>
                <View style={Styles.inputRow}>
                    <TextInput
                        ref={myCallIdInputRef}
                        style={[Styles.inputContainer, { flex: 1 }]}
                        value={myCallId}
                        onChangeText={setMyCallId}
                        placeholderTextColor="#999"
                        editable={false}
                    />
                    <TouchableOpacity
                        style={Styles.copyButton}
                        onPress={copyMyCallId}
                    >
                        <Icon name="copy" size={16} color={Colours.white} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={Styles.joinButton}
                    onPress={createGroupCall}
                    disabled={loading}
                >
                    <Text style={Styles.buttonText}>Create Group Call</Text>
                </TouchableOpacity>
            </View>

            {/* Join Call Section */}
            <View style={[Styles.callContainer, { flexDirection: 'column' }]}>
                <Text style={Styles.sectionLabel}>Join a Call:</Text>
                <View style={Styles.inputRow}>
                    <TextInput
                        ref={callIdInputRef}
                        style={[Styles.inputContainer, { flex: 1 }]}
                        placeholder="Enter Call ID"
                        value={callId}
                        onChangeText={setCallId}
                        placeholderTextColor="#999"
                    />
                    <TouchableOpacity
                        style={Styles.copyButton}
                        onPress={pasteCallId}
                    >
                        <Icon name="paste" size={16} color={Colours.white} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={Styles.joinButton}
                    onPress={joinGroupCall}
                    disabled={loading}
                >
                    <Text style={Styles.buttonText}>Join Group Call</Text>
                </TouchableOpacity>
            </View>

            <Text style={Styles.subtitle}>Available Users</Text>

            {users.length === 0 ? (
                <Text style={Styles.noUsersText}>No other users available</Text>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View
                            style={Styles.userItem}
                        >
                            <Icon name="user" size={20} color={Colours.primary} style={Styles.userIcon} />
                            <Text style={Styles.userText}>{item.email}</Text>
                            <TouchableOpacity
                                onPress={() => startCall(item.uid, item.email)}
                                disabled={loading}
                            >
                                <Icon name="video-camera" size={20} color={Colours.primary} style={Styles.callIcon} />
                            </TouchableOpacity>

                        </View>
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