import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { auth, firestore } from '../services/firebase';
import Icon from 'react-native-vector-icons/FontAwesome';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Styles from '../assets/Styles';
import Colours from '../assets/Colours';
import Snackbar from 'react-native-snackbar';

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');


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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (email.trim() === '') {
            Snackbar.show({
                text: 'Please enter E-mail',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
            return;
        }

        if (!emailRegex.test(email)) {
            Snackbar.show({
                text: 'Please enter a valid E-mail',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
            return;
        }

        if (password.trim() === '') {
            Snackbar.show({
                text: 'Please enter your password',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
            return;
        }

        if (password.length < 6) {
            Snackbar.show({
                text: 'Password must be at least 6 characters',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
            return;
        }

        try {
            let userCredential;
            if (isLogin) { //Check the user is alreary registered or not
                userCredential = await auth().signInWithEmailAndPassword(email, password);
            } else {
                userCredential = await auth().createUserWithEmailAndPassword(email, password);
                await createUserDocument(userCredential.user);
            }
            console.log("Auth successful:", userCredential.user.uid);
        } catch (err) {
            Snackbar.show({
                text: 'Please check your E-mail or password',
                duration: Snackbar.LENGTH_SHORT,
                backgroundColor: Colours.snackBar,
                textColor: Colours.white,
                marginBottom: 10
            });
        }
    };


    return (
        <View style={Styles.container}>
            <Text style={Styles.header}>{isLogin ? 'Welcone back' : 'Welcome'}</Text>
            <Text style={Styles.title}>{isLogin ? 'Login here' : 'Sign Up here'}</Text>

            {error ? <Text style={Styles.error}>{error}</Text> : null}
            <View style={{ height: 10 }} />

            <View style={[Styles.inputContainer, { marginBottom: 15, }]}>
                <Icon name="envelope" size={20} color="#777" style={Styles.icon} />
                <TextInput
                    style={Styles.input}
                    placeholder="Enter your E-mail"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    cursorColor={Colours.primary}
                    placeholderTextColor={Colours.placeHolderText}
                />
            </View>

            <View style={[Styles.inputContainer, { marginBottom: 15, }]}>
                <Icon name="lock" size={20} color="#777" style={Styles.icon} />
                <TextInput
                    style={Styles.input}
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={secureTextEntry}
                    placeholderTextColor={Colours.placeHolderText}
                    cursorColor={Colours.primary}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                    {
                        secureTextEntry ? (
                            <Ionicons name="eye-off" size={20} color="#777" style={Styles.icon} />
                        ) : (
                            <Ionicons name="eye" size={20} color="#777" style={Styles.icon} />
                        )
                    }
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={Styles.buttonContainer} onPress={handleAuth}>
                <Text style={Styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                <Text style={Styles.switchText}>
                    {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};


export default AuthScreen;