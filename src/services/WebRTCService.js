import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { firestore } from './firebase';

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    {
        urls: 'turn:your-turn-server.com',
        username: 'username',
        credential: 'password'
    }
];

class WebRTCService {
    constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCallId = null;
        this.callerId = null;
        this.calleeId = null;
        this.isCaller = false;
    }

    initialize = async (callId, callerId, calleeId, isCaller) => {
        this.currentCallId = callId;
        this.callerId = callerId;
        this.calleeId = calleeId;
        this.isCaller = isCaller;

        try {
            // Get user media
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: 'user',
                    width: 640,
                    height: 480,
                    frameRate: 30
                }
            });

            // Create peer connection
            this.pc = new RTCPeerConnection({ iceServers: iceServers });

            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream);
            });

            // Setup ICE handlers
            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    firestore().collection('calls').doc(callId).update({
                        iceCandidates: firestore.FieldValue.arrayUnion(JSON.stringify(event.candidate))
                    });
                }
            };

            // Handle remote stream
            this.pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                }
            };

            // Handle connection state changes
            this.pc.onconnectionstatechange = () => {
                console.log('Connection state:', this.pc.connectionState);
                if (this.pc.connectionState === 'disconnected' || 
                    this.pc.connectionState === 'failed') {
                    this.cleanup();
                }
            };

            return this.localStream;
        } catch (err) {
            console.error('WebRTC initialization error:', err);
            throw err;
        }
    };

    createOffer = async () => {
        try {
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(offer);

            await firestore().collection('calls').doc(this.currentCallId).update({
                offer: JSON.stringify(offer),
                status: 'waiting',
                updatedAt: firestore.FieldValue.serverTimestamp()
            });

            return offer;
        } catch (err) {
            console.error('Error creating offer:', err);
            throw err;
        }
    };

    createAnswer = async (offer) => {
        try {
            await this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
            const answer = await this.pc.createAnswer();
            await this.pc.setLocalDescription(answer);

            await firestore().collection('calls').doc(this.currentCallId).update({
                answer: JSON.stringify(answer),
                status: 'connected',
                updatedAt: firestore.FieldValue.serverTimestamp()
            });

            return answer;
        } catch (err) {
            console.error('Error creating answer:', err);
            throw err;
        }
    };

    addICECandidate = async (candidate) => {
        try {
            if (this.pc.remoteDescription) {
                await this.pc.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
            }
        } catch (err) {
            console.error('Error adding ICE candidate:', err);
        }
    };

    cleanup = () => {
        try {
            if (this.pc) {
                this.pc.close();
                this.pc = null;
            }
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }
            this.remoteStream = null;
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    };
}

export default new WebRTCService();