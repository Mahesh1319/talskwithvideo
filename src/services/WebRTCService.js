import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
} from 'react-native-webrtc';
import { firestore } from './firebase';

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
];

class WebRTCService {
  constructor() {
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCallId = null;
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
  }

  initialize = async (callId) => {
    this.currentCallId = callId;

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: 'user',
        width: 640,
        height: 480,
        frameRate: 30,
      },
    });

    this.pc = new RTCPeerConnection({ iceServers });

    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream);
    });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        firestore().collection('calls').doc(callId).update({
          iceCandidates: firestore.FieldValue.arrayUnion(
            JSON.stringify(event.candidate)
          ),
        });
      }
    };

    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      }
    };

    this.pc.onconnectionstatechange = () => {
      if (
        this.pc.connectionState === 'disconnected' ||
        this.pc.connectionState === 'failed'
      ) {
        this.cleanup();
      }
    };

    return this.localStream;
  };

  createOffer = async () => {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await firestore().collection('calls').doc(this.currentCallId).update({
      offer: JSON.stringify(offer),
      status: 'waiting',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
    return offer;
  };

  createAnswer = async (offer) => {
    await this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
    this.isRemoteDescriptionSet = true;
    await this._drainIceCandidateQueue();

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await firestore().collection('calls').doc(this.currentCallId).update({
      answer: JSON.stringify(answer),
      status: 'connected',
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    return answer;
  };

  setRemoteDescription = async (desc) => {
    await this.pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(desc)));
    this.isRemoteDescriptionSet = true;
    await this._drainIceCandidateQueue();
  };

  addICECandidate = async (candidate) => {
    const ice = new RTCIceCandidate(JSON.parse(candidate));
    if (this.isRemoteDescriptionSet) {
      await this.pc.addIceCandidate(ice);
    } else {
      this.iceCandidateQueue.push(ice);
    }
  };

  _drainIceCandidateQueue = async () => {
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      await this.pc.addIceCandidate(candidate);
    }
  };

  cleanup = () => {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.remoteStream = null;
    this.iceCandidateQueue = [];
    this.isRemoteDescriptionSet = false;
  };

  getRemoteStream = () => this.remoteStream;
}

export default new WebRTCService();
