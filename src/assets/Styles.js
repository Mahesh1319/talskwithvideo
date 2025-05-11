import { StyleSheet } from "react-native";
import Colours from "./Colours";


const Styles = StyleSheet.create({
   container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    header: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: Colours.dark,
    },
      title: {
        fontSize: 26,
        fontWeight: 'semibold',
        marginBottom: 20,
        textAlign: 'center',
        color: Colours.dark,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        //marginBottom: 15,
        backgroundColor: Colours.lite_background,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: Colours.containerBorderColour,
        paddingHorizontal: 10,
        elevation: 2,
    },
    icon: {
        marginRight: 10,
        color:Colours.primary
    },
    input: {
        flex: 1,
        height: 50,
        color: '#333',
        fontSize:16,
    },
    buttonContainer: {
        backgroundColor: Colours.primary,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
        borderRadius:10
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    switchText: {
        marginTop: 20,
        textAlign: 'center',
        color: Colours.linkText,
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginBottom: 10,
    },

    //////

    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 10,
        color: Colours.dark,
    },
    callContainer: {
        flexDirection: 'row',
        marginBottom: 20,
        alignItems: 'center',

    },
    // input: {
    //     flex: 1,
    //     height: 50,
    //     backgroundColor: '#fff',
    //     paddingHorizontal: 15,
    //     borderRadius: 5,
    //     borderWidth: 1,
    //     borderColor: '#ddd',
    //     color: '#333',
    // },
    callIdButtons: {
        flexDirection: 'row',
        marginLeft: 5,
        alignItems: 'center',
        alignSelf:"center"
    },
    smallButton: {
        backgroundColor: Colours.primary,
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 2,
    },
    joinButton: {
        backgroundColor: Colours.primary,
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
        backgroundColor: Colours.logout,
        padding: 15,
        borderRadius: 10,
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
       modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        height: '50%',
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 15,
    },
    callerHeading: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    callerText: {
        fontSize: 20,
        fontWeight: '500',
        marginBottom: 20,
        textAlign: 'center',
    },
    callButtonContainer: {
        flexDirection: 'row',
        gap: '40%',
        position:'absolute',
        //justifyContent:'space-between',
        bottom:20
    },
    acceptButton: {
        backgroundColor: 'green',
        paddingVertical: 10,
        paddingHorizontal: 20,
         borderRadius: 45,
        height:90,
        width:90,
        alignItems:'center',
        justifyContent:'center'
    },
    rejectButton: {
        backgroundColor: 'red',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 45,
        height:90,
        width:90,
        alignItems:'center',
        justifyContent:'center'
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },


})

export default Styles;