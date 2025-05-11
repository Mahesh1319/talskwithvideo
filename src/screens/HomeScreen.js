import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert, Clipboard } from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const HomeScreen = ({ navigation }) => {
    const [users, setUsers] = useState([]);
    const [callId, setCallId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clipboardContent, setClipboardContent] = useState('');
    const callIdInputRef = useRef(null);

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

    const showIncomingCallAlert = (callId, callData) => {
        Alert.alert(
            'Incoming Video Call',
            `Call from ${callData.callerEmail || 'Unknown caller'}`,
            [
                {
                    text: 'Reject',
                    onPress: () => rejectCall(callId),
                    style: 'destructive'
                },
                {
                    text: 'Accept',
                    onPress: () => acceptCall(callId, callData)
                }
            ],
            { cancelable: false }
        );
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
            Alert.alert('Call rejected');
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
            Alert.alert('Error', 'Please enter a call ID');
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
        if (!callId.trim()) return;
        Clipboard.setString(callId);
        Alert.alert('Copied!', 'Call ID copied to clipboard');
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
            navigation.navigate('Auth');
        } catch (err) {
            console.error("Sign out error:", err);
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#4285f4" />
                <Text style={styles.loadingText}>Loading users...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={handleRetry}
                >
                    <Text style={styles.buttonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.retryButton, { backgroundColor: '#db4437', marginTop: 10 }]}
                    onPress={handleSignOut}
                >
                    <Text style={styles.buttonText}>Logout</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Welcome, {auth().currentUser?.email}</Text>

            <View style={styles.callContainer}>
                <TextInput
                    ref={callIdInputRef}
                    style={styles.input}
                    placeholder="Enter Call ID"
                    value={callId}
                    onChangeText={setCallId}
                    placeholderTextColor="#999"
                />
                <View style={styles.callIdButtons}>
                    <TouchableOpacity style={styles.smallButton} onPress={copyCallId}>
                        <Icon name="copy" size={16} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.smallButton} onPress={pasteCallId}>
                        <Icon name="paste" size={16} color="white" />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.joinButton}
                    onPress={joinCall}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Join Call</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>Available Users</Text>

            {users.length === 0 ? (
                <Text style={styles.noUsersText}>No other users available</Text>
            ) : (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.userItem}
                            onPress={() => startCall(item.uid, item.email)}
                            disabled={loading}
                        >
                            <Icon name="user" size={20} color="#4285f4" style={styles.userIcon} />
                            <Text style={styles.userText}>{item.email}</Text>
                            <Icon name="video-camera" size={20} color="#4285f4" style={styles.callIcon} />
                        </TouchableOpacity>
                    )}
                />
            )}

            <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleSignOut}
                disabled={loading}
            >
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
        color: '#555',
    },
    callContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 50,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        color: '#333',
    },
    callIdButtons: {
        flexDirection: 'row',
        marginLeft: 5,
    },
    smallButton: {
        backgroundColor: '#4285f4',
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 2,
    },
    joinButton: {
        backgroundColor: '#4285f4',
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        marginLeft: 10,
        height: 50,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 5,
        marginBottom: 10,
        elevation: 2,
    },
    userIcon: {
        marginRight: 10,
    },
    userText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    callIcon: {
        marginLeft: 10,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: '#db4437',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 20,
    },
    errorText: {
        color: 'red',
        marginBottom: 20,
        textAlign: 'center',
        fontSize: 16,
    },
    noUsersText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#666',
        fontSize: 16,
    },
    retryButton: {
        backgroundColor: '#4285f4',
        padding: 15,
        borderRadius: 5,
        width: 150,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#555',
    },
});

export default HomeScreen;