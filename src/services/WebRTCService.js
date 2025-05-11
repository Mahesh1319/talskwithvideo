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

class WebRTCService { constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCallId = null;
        this.remoteStreamListeners = [];
        this.pendingIceCandidates = [];
        this.isSettingRemoteDescription = false;
    }

    initialize = async (callId, isFrontCamera = true) => {
        try {
            this.currentCallId = callId;
            this.pendingIceCandidates = [];
            
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

            // Track handler
            this.pc.ontrack = (event) => {
                console.log('Received remote track:', event.track.kind);
                if (event.streams && event.streams.length > 0) {
                    // Use the stream directly (don't create new MediaStream)
                    this.remoteStream = event.streams[0];
                    this._notifyRemoteStreamListeners();
                }
            };

            // Connection state handlers
            this.pc.onconnectionstatechange = () => {
                console.log('Connection state:', this.pc.connectionState);
            };

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
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    };

    createAnswer = async () => {
        try {
            // Wait until we're in the correct state
            if (this.pc.signalingState !== 'have-remote-offer') {
                await new Promise(resolve => {
                    const checkState = () => {
                        if (this.pc.signalingState === 'have-remote-offer') {
                            resolve();
                        } else {
                            setTimeout(checkState, 100);
                        }
                    };
                    checkState();
                });
            }

            const answer = await this.pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(answer);
            return answer;
        } catch (error) {
            console.error('Error creating answer:', error);
            throw error;
        }
    };

    setRemoteDescription = async (desc) => {
        if (this.isSettingRemoteDescription) return;
        
        this.isSettingRemoteDescription = true;
        try {
            const parsedDesc = JSON.parse(desc);
            
            // Skip if we already have this description
            if (this.pc.remoteDescription && 
                this.pc.remoteDescription.type === parsedDesc.type) {
                return;
            }

            await this.pc.setRemoteDescription(new RTCSessionDescription(parsedDesc));
            
            // Process any pending ICE candidates
            this._processPendingIceCandidates();
        } catch (error) {
            console.error('Error setting remote description:', error);
            throw error;
        } finally {
            this.isSettingRemoteDescription = false;
        }
    };

    addICECandidate = async (candidate) => {
        try {
            const iceCandidate = new RTCIceCandidate(JSON.parse(candidate));
            
            // If we don't have remote description yet, queue the candidate
            if (!this.pc.remoteDescription) {
                this.pendingIceCandidates.push(iceCandidate);
                return;
            }
            
            await this.pc.addIceCandidate(iceCandidate);
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
            throw error;
        }
    };

    _processPendingIceCandidates = async () => {
        while (this.pendingIceCandidates.length > 0) {
            const candidate = this.pendingIceCandidates.shift();
            try {
                await this.pc.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error processing pending ICE candidate:', error);
            }
        }
    };

    switchCamera = async (isFront) => {
        try {
            if (!this.localStream) return;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return;

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

            // Get the new video track
            const newVideoTrack = newStream.getVideoTracks()[0];

            // Find the sender that's currently sending our video track
            const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');

            if (sender) {
                // Replace the track with the new one
                await sender.replaceTrack(newVideoTrack);

                // Stop the old track
                videoTrack.stop();

                // Update local stream with new track
                this.localStream.removeTrack(videoTrack);
                this.localStream.addTrack(newVideoTrack);

                // Stop the unused tracks from the new stream
                newStream.getTracks().forEach(track => {
                    if (track !== newVideoTrack) track.stop();
                });
            } else {
                console.warn('No video sender found');
                newStream.getTracks().forEach(track => track.stop());
            }

            return true;
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
        return () => {
            this.remoteStreamListeners = this.remoteStreamListeners.filter(cb => cb !== callback);
        };
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