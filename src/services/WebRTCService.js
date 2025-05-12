import {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    mediaDevices,
} from 'react-native-webrtc';
import { firestore } from './firebase';

const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    // Add TURN servers here if needed
];


//This is the very important file of our application

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

    //This function is to initialize our call

    initialize = async (callId, isCaller) => {
        try {
            this.currentCallId = callId;
            
            // Get user media with proper constraints
            this.localStream = await mediaDevices.getUserMedia({
                audio: true,
                video: {
                    facingMode: 'user',
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 },
                    frameRate: { min: 15, ideal: 30 }
                }
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
    
            // Track event handler for remote streams
            this.pc.ontrack = (event) => {
                console.log('Received track event:', event);
                if (event.streams && event.streams.length > 0) {
                    this.remoteStream = event.streams[0];
                    this._notifyRemoteStreamListeners();
                }
            };
    
            // Connection state handlers for debugging
            this.pc.onconnectionstatechange = () => {
                console.log('Connection state changed:', this.pc.connectionState);
            };
    
            this.pc.oniceconnectionstatechange = () => {
                console.log('ICE connection state changed:', this.pc.iceConnectionState);
            };
    
            this.pc.onsignalingstatechange = () => {
                console.log('Signaling state changed:', this.pc.signalingState);
            };
    
            return this.localStream;
        } catch (error) {
            console.error('WebRTC init error:', error);
            throw error;
        }
    };

    //this on to create the call
    createOffer = async () => {
        try {
            const offer = await this.pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(offer);
            console.log('Created offer:', offer);
            return offer;
        } catch (error) {
            console.error('Error creating offer:', error);
            throw error;
        }
    };

    //this on is to answer the call
    createAnswer = async () => {
        try {
            const answer = await this.pc.createAnswer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });
            await this.pc.setLocalDescription(answer);
            console.log('Created answer:', answer);
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
            const parsedDesc = typeof desc === 'string' ? JSON.parse(desc) : desc;
            
            if (this.pc.remoteDescription && 
                this.pc.remoteDescription.type === parsedDesc.type) {
                console.log('Remote description already set with same type');
                return;
            }

            console.log('Setting remote description:', parsedDesc);
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
            const iceCandidate = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
            const rtcIceCandidate = new RTCIceCandidate(iceCandidate);
            
            if (!this.pc.remoteDescription) {
                console.log('Remote description not set yet, queuing ICE candidate');
                this.pendingIceCandidates.push(rtcIceCandidate);
                return;
            }
            
            console.log('Adding ICE candidate:', rtcIceCandidate);
            await this.pc.addIceCandidate(rtcIceCandidate);
        } catch (error) {
            console.log('Error adding ICE candidate:', error);
            // Don't throw error for ICE candidates as they might be duplicates
        }
    };

    _processPendingIceCandidates = async () => {
        console.log('Processing pending ICE candidates:', this.pendingIceCandidates.length);
        while (this.pendingIceCandidates.length > 0) {
            const candidate = this.pendingIceCandidates.shift();
            try {
                await this.pc.addIceCandidate(candidate);
            } catch (error) {
                console.error('Error processing pending ICE candidate:', error);
            }
        }
    };

    //function to switch the camera
    switchCamera = async (isFront) => {
        try {
            if (!this.localStream) return;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (!videoTrack) return;

            const newStream = await mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: isFront ? 'user' : 'environment',
                    width: { min: 640, ideal: 1280 },
                    height: { min: 480, ideal: 720 },
                    frameRate: { min: 15, ideal: 30 }
                }
            });

            const newVideoTrack = newStream.getVideoTracks()[0];
            const sender = this.pc.getSenders().find(s => s.track && s.track.kind === 'video');

            if (sender) {
                console.log('Replacing video track');
                await sender.replaceTrack(newVideoTrack);
                videoTrack.stop();
                this.localStream.removeTrack(videoTrack);
                this.localStream.addTrack(newVideoTrack);
                newStream.getTracks().forEach(track => {
                    if (track !== newVideoTrack) track.stop();
                });
            } else {
                console.error('No video sender found');
                newStream.getTracks().forEach(track => track.stop());
                throw new Error('No video sender found');
            }
        } catch (error) {
            console.error('Error switching camera:', error);
            throw error;
        }
    };

    //function to triiger remote stream
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
        console.log('Notifying remote stream listeners');
        this.remoteStreamListeners.forEach(callback => {
            try {
                callback(this.remoteStream);
            } catch (error) {
                console.error('Error in remote stream listener:', error);
            }
        });
    };

    //clean up after the call end
    cleanup = () => {
        try {
            console.log('Cleaning up WebRTC resources');
            
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