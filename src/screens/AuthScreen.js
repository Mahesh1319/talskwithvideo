import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');

    //   const handleAuth = async () => {
    //     console.log("email",email);
    //     console.log("password",password);
    //     try {
    //       if (isLogin) {
    //         await auth().signInWithEmailAndPassword(email, password);
    //       } else {
    //         await auth().createUserWithEmailAndPassword(email, password);
    //       }
    //     } catch (err) {
    //         console.log("error",err);
    //       setError(err.message);
    //     }
    //   };

    // const handleAuth = async () => {
    //     try {
    //         let userCredential;
    //         if (isLogin) {
    //             userCredential = await auth().signInWithEmailAndPassword(email, password);
    //         } else {
    //             userCredential = await auth().createUserWithEmailAndPassword(email, password);
    //             // Create user document after signup
    //             await createUserDocument(userCredential.user);
    //         }
    //         console.log("User authenticated:", userCredential.user.uid);
    //     } catch (err) {
    //         setError(err.message);
    //     }
    // };


    // // Define this outside the component (helper function)
    // const createUserDocument = async (user) => {
    //     console.log("Creating user document:", user.uid, user.email);
    //       console.log("Creating user time---->:", Date.now());
    //     //console.log("Creating user time---->:", firestore.FieldValue.serverTimestamp());
    //     await firestore()
    //         .collection('users')
    //         .doc(user.uid)
    //         .set({
    //             uid: user.uid,
    //             email: user.email,
    //             createdAt: Date.now(),
    //         });
    // };

    const createUserDocument = async (user) => {
        try {
            console.log("Creating user document:", user.uid, user.email);

            await firestore()
                .collection('users')
                .doc(user.uid)
                .set({
                    uid: user.uid,
                    email: user.email,
                    createdAt: firestore.FieldValue.serverTimestamp(), // Use server timestamp
                    lastUpdated: firestore.FieldValue.serverTimestamp()
                });

            console.log("User document created successfully");
        } catch (err) {
            console.error("Error creating user document:", err);
            throw err; // Re-throw to handle in calling function
        }
    };

    const handleAuth = async () => {
        try {
            let userCredential;
            if (isLogin) {
                userCredential = await auth().signInWithEmailAndPassword(email, password);
            } else {
                userCredential = await auth().createUserWithEmailAndPassword(email, password);
                // Only create document for new users
                await createUserDocument(userCredential.user);
            }
            console.log("Auth successful:", userCredential.user.uid);
        } catch (err) {
            console.error("Auth error:", err);
            setError(err.message);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{isLogin ? 'Login' : 'Sign Up'}</Text>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <View style={styles.inputContainer}>
                <Icon name="envelope" size={20} color="#777" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />
            </View>

            <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#777" style={styles.icon} />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleAuth}>
                <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={styles.switchText}>
                    {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: '#fff',
        borderRadius: 5,
        paddingHorizontal: 10,
        elevation: 2,
    },
    icon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
    },
    button: {
        backgroundColor: '#4285f4',
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    switchText: {
        marginTop: 20,
        textAlign: 'center',
        color: '#4285f4',
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
    },
});

export default AuthScreen;