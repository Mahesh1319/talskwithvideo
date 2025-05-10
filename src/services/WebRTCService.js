import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
} from 'react-native-webrtc';
import { firestore } from './firebase';
import { handleFirestoreError } from '../utils/errorHandler';

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add your TURN servers here for production
];

class WebRTCService {
    constructor() {
        this.peerConnections = {}; // Track multiple connections
        this.localStream = null;
        this.remoteStreams = []; // Array for multiple remote streams
        this.currentCallId = null;
    }

    // Initialize local stream
    initLocalStream = async () => {
        try {
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: 'user',
                    width: 1280,
                    height: 720,
                    frameRate: 30,
                },
            });
            return this.localStream;
        } catch (err) {
            console.error('Error getting user media:', err);
            throw err;
        }
    };

    // Create new peer connection
    createPeerConnection = (peerId) => {
        const pc = new RTCPeerConnection({ iceServers });

        // Add local stream tracks
        this.localStream.getTracks().forEach(track => {
            pc.addTrack(track, this.localStream);
        });

        // ICE Candidate handler
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendICECandidate(peerId, event.candidate);
            }
        };

        // Track handler for remote streams
        pc.ontrack = (event) => {
            const newStream = event.streams[0];
            this.remoteStreams = [...this.remoteStreams, newStream];
        };

        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${peerId}:`, pc.connectionState);
        };

        this.peerConnections[peerId] = pc;
        return pc;
    };

    // Update the createOffer method:
    async createOffer() {
        try {
            const offer = await this.pc.createOffer();
            await this.pc.setLocalDescription(offer);

            await firestore()
                .collection('calls')
                .doc(this.currentCallId)
                .update({
                    offer: JSON.stringify(offer),
                    participants: [this.callerId, this.calleeId], // Ensure participants exist
                    updatedAt: firestore.FieldValue.serverTimestamp()
                });
        } catch (err) {
            console.error("Offer creation failed:", err);
            throw new Error("Failed to create offer. Check Firestore permissions.");
        }
    }

    // Start call as broadcaster
    startCall = async (peerId) => {
        const pc = this.createPeerConnection(peerId);
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Save offer to Firestore
            await firestore()
                .collection('calls')
                .doc(this.currentCallId)
                .collection('peers')
                .doc(peerId)
                .set({
                    offer: JSON.stringify(offer),
                    status: 'waiting',
                });

            return offer;
        } catch (err) {
            console.error('Error creating offer:', err);
            throw err;
        }
    };

    // Join call as participant
    joinCall = async (peerId, remoteOffer) => {
        const pc = this.createPeerConnection(peerId);
        try {
            await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(remoteOffer))
            );

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // Send answer back to broadcaster
            await firestore()
                .collection('calls')
                .doc(this.currentCallId)
                .collection('peers')
                .doc(peerId)
                .update({
                    answer: JSON.stringify(answer),
                    status: 'connected',
                });

            return answer;
        } catch (err) {
            console.error('Error joining call:', err);
            throw err;
        }
    };

    // ICE Candidate exchange
    sendICECandidate = async (peerId, candidate) => {
        await firestore()
            .collection('calls')
            .doc(this.currentCallId)
            .collection('peers')
            .doc(peerId)
            .update({
                iceCandidates: firestore.FieldValue.arrayUnion(
                    JSON.stringify(candidate)
                ),
            });
    };

    // Hang up call
    hangUp = async (peerId) => {
        if (this.peerConnections[peerId]) {
            this.peerConnections[peerId].close();
            delete this.peerConnections[peerId];
        }

        // Update status in Firestore
        await firestore()
            .collection('calls')
            .doc(this.currentCallId)
            .collection('peers')
            .doc(peerId)
            .update({
                status: 'ended',
            });
    };

    // Clean up all connections
    cleanup = () => {
        Object.keys(this.peerConnections).forEach(peerId => {
            this.hangUp(peerId);
        });
        this.remoteStreams = [];
    };
}

export default new WebRTCService();