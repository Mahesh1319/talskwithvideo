import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
} from 'react-native-webrtc';
import { firestore } from './firebase';

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add your TURN servers here if needed
];

class WebRTCService {
    constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCallId = null;
        this.remoteStreamListeners = [];
    }

    initialize = async (callId, isFrontCamera = true) => {
        try {
            this.currentCallId = callId;
            
            // Create new peer connection
            this.pc = new RTCPeerConnection({ iceServers });
            
            // Get user media
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: isFrontCamera ? 'user' : 'environment',
                    width: 640,
                    height: 480,
                    frameRate: 30,
                },
            });

            // Add tracks to peer connection
            this.localStream.getTracks().forEach((track) => {
                this.pc.addTrack(track, this.localStream);
            });

            // ICE Candidate handler
            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    firestore()
                        .collection('calls')
                        .doc(callId)
                        .update({
                            iceCandidates: firestore.FieldValue.arrayUnion(
                                JSON.stringify(event.candidate)
                            ),
                        });
                }
            };

            // Track handler - this is crucial for remote video
            this.pc.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (event.streams && event.streams.length > 0) {
                    this.remoteStream = event.streams[0];
                    this._notifyRemoteStreamListeners();
                }
            };

            // Connection state handler
            this.pc.onconnectionstatechange = () => {
                console.log('Connection state:', this.pc.connectionState);
                if (this.pc.connectionState === 'disconnected' || 
                    this.pc.connectionState === 'failed') {
                    this.cleanup();
                }
            };

            // ICE connection state handler
            this.pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state:', this.pc.iceConnectionState);
            };

            return this.localStream;
        } catch (error) {
            console.error('WebRTC initialization error:', error);
            this.cleanup();
            throw error;
        }
    };

    createOffer = async () => {
        try {
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(offer);
            
            await firestore()
                .collection('calls')
                .doc(this.currentCallId)
                .update({
                    offer: JSON.stringify(offer),
                    status: 'waiting',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    };

    createAnswer = async (offer) => {
        try {
            const parsedOffer = JSON.parse(offer);
            await this.pc.setRemoteDescription(new RTCSessionDescription(parsedOffer));
            
            const answer = await this.pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(answer);
            
            await firestore()
                .collection('calls')
                .doc(this.currentCallId)
                .update({
                    answer: JSON.stringify(answer),
                    status: 'connected',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                });
            
            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            throw error;
        }
    };

    setRemoteDescription = async (desc) => {
        try {
            const parsedDesc = JSON.parse(desc);
            await this.pc.setRemoteDescription(new RTCSessionDescription(parsedDesc));
        } catch (error) {
            console.error('Error setting remote description:', error);
            throw error;
        }
    };

    addICECandidate = async (candidate) => {
        try {
            const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
            await this.pc.addIceCandidate(iceCandidate);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            throw error;
        }
    };

    switchCamera = async (isFront) => {
        try {
            if (!this.localStream) return;
            
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return;
            
            // Stop the current track
            videoTrack.stop();
            
            // Get new media with the opposite facing mode
            const newStream = await mediaDevices.getUserMedia({
                audio: false, // We don't need audio here
                video: {
                    facingMode: isFront ? 'user' : 'environment',
                    width: 640,
                    height: 480,
                    frameRate: 30
                }
            });
            
            // Replace the video track
            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = this.pc.getSenders().find(s => s.track.kind === 'video');
            await sender.replaceTrack(newVideoTrack);
            
            // Update local stream
            this.localStream.removeTrack(videoTrack);
            this.localStream.addTrack(newVideoTrack);
            
            // Stop the unused tracks from the new stream
            newStream.getTracks().forEach(track => track.stop());
        } catch (error) {
            console.error('Error switching camera:', error);
            throw error;
        }
    };

    onRemoteStream = (callback) => {
        this.remoteStreamListeners.push(callback);
        if (this.remoteStream) {
            callback(this.remoteStream);
        }
    };

    _notifyRemoteStreamListeners = () => {
        this.remoteStreamListeners.forEach(callback => {
            callback(this.remoteStream);
        });
    };

    cleanup = () => {
        try {
            if (this.pc) {
                this.pc.onicecandidate = null;
                this.pc.ontrack = null;
                this.pc.onconnectionstatechange = null;
                this.pc.oniceconnectionstatechange = null;
                this.pc.close();
                this.pc = null;
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach((track) => track.stop());
                this.localStream = null;
            }

            this.remoteStream = null;
            this.remoteStreamListeners = [];
            this.currentCallId = null;
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    };

    getRemoteStream = () => this.remoteStream;
}

export default new WebRTCService();