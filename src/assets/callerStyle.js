import { StatusBar, StyleSheet } from "react-native";
import Colours from "./Colours";


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
        color:Colours.white,
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
        color:Colours.white,
    },
    statusBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 40 : StatusBar.currentHeight + 10,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    statusText: {
        color:Colours.white,
        fontSize: 18,
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 10,
        borderRadius: 5,
    },
    durationText: {
        color:Colours.white,
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
        color:Colours.white,
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
        color:Colours.white,
        marginTop: 5,
        fontSize: 10,
    },


})

export default styles;