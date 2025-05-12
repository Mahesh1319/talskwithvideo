import { StatusBar, StyleSheet } from "react-native";
import Colours from "./Colours";

//Here we declares the styles of callerScreen
const styles = StyleSheet.create({
    container: {
        padding: 10,
        backgroundColor: '#f8f9fa',
        borderTopWidth: 1,
        borderTopColor: '#dee2e6',
      },
      statusContainer: {
        marginBottom: 15,
        alignItems: 'center',
      },
      statusText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#495057',
      },
      streamStatus: {
        fontSize: 14,
        color: '#6c757d',
        marginTop: 5,
      },
      buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
      },
      button: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 5,
        marginHorizontal: 5,
      },
      startButton: {
        backgroundColor: '#28a745',
      },
      joinButton: {
        backgroundColor: '#17a2b8',
      },
      copyButton: {
        backgroundColor: '#ffc107',
      },
      pasteButton: {
        backgroundColor: '#fd7e14',
      },
      hangupButton: {
        backgroundColor: '#dc3545',
      },
      buttonText: {
        color: 'white',
        marginLeft: 8,
        fontWeight: 'bold',
      },
})

export default styles;