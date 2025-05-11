export default function CallNotification({ call, onAccept, onReject }) {
  return (
    <View style={styles.container}>
      <Text>Incoming Call from {call.callerId}</Text>
      <Button title="Accept" onPress={onAccept} />
      <Button title="Reject" onPress={onReject} />
    </View>
  );
}