import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
} from 'react-native-webrtc';
import { firestore } from './firebase';

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    // Add TURN servers here if needed
];

class WebRTCService {
    constructor() {
        this.pc = null;
        this.localStream = null;
        this.remoteStream = null;
        this.currentCallId = null;
        this.remoteStreamListeners = [];
        this.pendingIceCandidates = [];
        this.isSettingRemoteDescription = false;
    }

    initialize = async (callId, isCaller) => {
        try {
            this.currentCallId = callId;
            
            // Get user media
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: { facingMode: 'user' }
            });
    
            // Create peer connection
            this.pc = new RTCPeerConnection({ iceServers });
    
            // Add local stream tracks
            this.localStream.getTracks().forEach(track => {
                this.pc.addTrack(track, this.localStream);
            });
    
            // ICE candidate handler
            this.pc.onicecandidate = (event) => {
                if (event.candidate) {
                    firestore().collection('calls').doc(callId).update({
                        iceCandidates: firestore.FieldValue.arrayUnion(
                            JSON.stringify(event.candidate)
                        )
                    });
                }
            };
    
            // Remote stream handler
            this.pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    this.remoteStream = event.streams[0];
                    console.log('Remote stream received');
                }
            };
    
            return this.localStream;
        } catch (error) {
            console.error('WebRTC init error:', error);
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
            // Check if we have a valid remote offer
            if (!this.pc.remoteDescription || this.pc.remoteDescription.type !== 'offer') {
                throw new Error('No valid remote offer to answer');
            }

            // If we're already in the correct state, proceed immediately
            if (this.pc.signalingState === 'have-remote-offer') {
                const answer = await this.pc.createAnswer({
                    offerToReceiveAudio: true,
                    offerToReceiveVideo: true
                });
                await this.pc.setLocalDescription(answer);
                return answer;
            }

            // Otherwise, wait for the state to transition
            return new Promise((resolve, reject) => {
                if (!this.pc) {
                    reject(new Error('PeerConnection is null'));
                    return;
                }

                const timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error(`Timeout waiting for correct state. Current: ${this.pc?.signalingState}`));
                }, 10000);

                const stateChangeHandler = async () => {
                    if (!this.pc) {
                        cleanup();
                        reject(new Error('PeerConnection is null'));
                        return;
                    }

                    console.log('Signaling state changed to:', this.pc.signalingState);
                    if (this.pc.signalingState === 'have-remote-offer') {
                        try {
                            const answer = await this.pc.createAnswer({
                                offerToReceiveAudio: true,
                                offerToReceiveVideo: true
                            });
                            await this.pc.setLocalDescription(answer);
                            cleanup();
                            resolve(answer);
                        } catch (err) {
                            cleanup();
                            reject(err);
                        }
                    } else if (this.pc.signalingState === 'closed') {
                        cleanup();
                        reject(new Error('Connection closed before answer could be created'));
                    }
                };

                const cleanup = () => {
                    clearTimeout(timeout);
                    if (this.pc) {
                        this.pc.onsignalingstatechange = null;
                    }
                };

                // Set the handler
                this.pc.onsignalingstatechange = stateChangeHandler;
            });
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
            
            if (this.pc.remoteDescription && 
                this.pc.remoteDescription.type === parsedDesc.type) {
                return;
            }

            await this.pc.setRemoteDescription(new RTCSessionDescription(parsedDesc));
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

            const newStream = await mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: isFront ? 'user' : 'environment',
                    width: 640,
                    height: 480,
                    frameRate: 30
                }
            });

            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');

            if (sender) {
                await sender.replaceTrack(newVideoTrack);
                videoTrack.stop();
                this.localStream.removeTrack(videoTrack);
                this.localStream.addTrack(newVideoTrack);
                newStream.getTracks().forEach(track => {
                    if (track !== newVideoTrack) track.stop();
                });
            } else {
                newStream.getTracks().forEach(track => track.stop());
                throw new Error('No video sender found');
            }
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
                this.pc.onsignalingstatechange = null;
                this.pc.close();
                this.pc = null;
            }

            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.remoteStream) {
                this.remoteStream.getTracks().forEach(track => track.stop());
                this.remoteStream = null;
            }

            this.remoteStreamListeners = [];
            this.currentCallId = null;
            this.pendingIceCandidates = [];
            this.isSettingRemoteDescription = false;
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    };

    getRemoteStream = () => this.remoteStream;
}

export default new WebRTCService();
