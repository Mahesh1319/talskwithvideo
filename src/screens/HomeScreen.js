import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const HomeScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [callId, setCallId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
        // const callsCollection = firestore().collection('calls').doc('ZEgRP1FaLVUrQMsImfLg').get();
        // const usersCollection = firestore().collection('users').doc('ZEgRP1FaLVUrQMsImfLg').get();
        // console.log("usersCollection dataaa----->",callsCollection);
        // console.log("usersCollection dataaa----->",usersCollection);
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

  const startCall = async (calleeId) => {
    try {
      setLoading(true);
      const callerId = auth().currentUser?.uid;
      if (!callerId) throw new Error("Not authenticated");

      const callDoc = firestore().collection('calls').doc();
      
      await callDoc.set({
        callerId,
        calleeId,
        callId: callDoc.id,
        status: 'calling',
        participants: [callerId, calleeId],
        iceCandidates: [],
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp()
      });

      navigation.navigate('Call', {
        callId: callDoc.id,
        callerId,
        calleeId,
        isCaller: true,
      });
    } catch (err) {
      console.error("Call start error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const joinCall = () => {
    if (!callId.trim()) {
      setError('Please enter a valid Call ID');
      return;
    }
    
    navigation.navigate('Call', {
      callId,
      isCaller: false,
    });
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    useEffect(() => fetchUsers(), []);
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {auth().currentUser?.email}</Text>
      
      <View style={styles.callContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter Call ID"
          value={callId}
          onChangeText={setCallId}
          placeholderTextColor="#999"
        />
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
              onPress={() => startCall(item.uid)}
              disabled={loading}
            >
              <Icon name="user" size={20} color="#4285f4" style={styles.userIcon} />
              <Text style={styles.userText}>{item.email}</Text>
              <Icon name="phone" size={20} color="#4285f4" style={styles.callIcon} />
            </TouchableOpacity>
          )}
        />
      )}
      
      <TouchableOpacity 
        style={styles.logoutButton} 
        onPress={() => auth().signOut()}
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