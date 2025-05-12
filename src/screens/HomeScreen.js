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


    useEffect(() => {
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

    // const showIncomingCallAlert = (callId, callData) => {
    //     Alert.alert(
    //         'Incoming Video Call',
    //         `Call from ${callData.callerEmail || 'Unknown caller'}`,
    //         [
    //             {
    //                 text: 'Reject',
    //                 onPress: () => rejectCall(callId),
    //                 style: 'destructive'
    //             },
    //             {
    //                 text: 'Accept',
    //                 onPress: () => acceptCall(callId, callData)
    //             }
    //         ],
    //         { cancelable: false }
    //     );
    // };

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
            //Alert.alert('Call rejected');
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
                callerEmail: callData.callerEmail
            });
        } catch (err) {
            console.error('Error accepting call:', err);
            Alert.alert('Error', 'Failed to accept call');
        }
    };

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
                createdAt: firestore.FieldValue.serverTimestamp()
            });

            navigation.navigate('Call', {
                callId: callDoc.id,
                callerId,
                calleeId,
                isCaller: true,
                calleeEmail
            });
        } catch (err) {
            console.error('Call failed:', err);
            Alert.alert('Error', 'Failed to start call: ' + err.message);
        }
    };

    const joinCall = async () => {
        if (!callId.trim()) {
            //Alert.alert('Error', 'Please enter a call ID');
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
            const callDoc = await firestore().collection('calls').doc(callId).get();
            if (!callDoc.exists) {
                throw new Error('Call not found');
            }

            const callData = callDoc.data();
            if (callData.status === 'ended') {
                throw new Error('This call has already ended');
            }

            navigation.navigate('Call', {
                callId,
                callerId: callData.callerId,
                calleeId: auth().currentUser.uid,
                isCaller: false,
                callerEmail: callData.callerEmail
            });
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const copyCallId = () => {
        //if (!callId.trim()) return;
        Clipboard.setString(auth().currentUser?.uid);
         Snackbar.show({
                text: 'Call ID copied to clipboard',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        // Alert.alert('Copied!', 'Call ID copied to clipboard');
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
            //navigation.navigate('Auth');
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
    )


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
                        <Text style={Styles.smallText}>Copy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={Styles.smallButton} onPress={pasteCallId}>
                        <Icon name="paste" size={16} color={Colours.white} />
                        <Text  style={Styles.smallText}>paste</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={Styles.joinButton}
                    onPress={joinCall}
                    disabled={loading}
                >
                    <Text style={Styles.buttonText}>Join Call</Text>
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
                        <TouchableOpacity
                            style={Styles.userItem}
                            onPress={() => startCall(item.uid, item.email)}
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