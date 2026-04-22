# 🎙️ MicLive - 24/7 Low-Latency Audio Monitor

MicLive is a premium, serverless, peer-to-peer audio monitoring tool built with React, Vite, and PeerJS. It allows you to broadcast high-quality audio from one device and listen on another with minimal latency.

## ✨ Features
- **P2P Streaming**: Direct device-to-device audio using WebRTC (Privacy-first).
- **24/7 Monitoring**: Includes Screen Wake Lock to prevent the broadcaster phone from sleeping.
- **Automatic Links**: Join rooms instantly via URL parameters.
- **Premium UI**: Glassmorphic design with a real-time frequency visualizer.

## 🚀 How to Use (Quick Start)

The easiest way to use MicLive is with **Automatic Live Links**.

### 1. The Host (Microphone)
Open this link on the device that will act as the microphone:
`https://mic-acces.vercel.app/?mode=broadcast&room=YOUR_ROOM_NAME`

### 2. The Listener (Monitor)
Open this link on the device you want to listen from:
`https://mic-acces.vercel.app/?mode=listen&room=YOUR_ROOM_NAME`

> [!IMPORTANT]
> **Audio Policy**: Most browsers require you to click the screen once to enable audio playback for the listener.

## 🛠️ Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Networking**: PeerJS (WebRTC)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Hosting**: Vercel

## 🔒 Security & Privacy
- **No Server Storage**: Audio is streamed directly between devices.
- **Encrypted**: WebRTC uses built-in encryption for all data streams.
- **Minimal Metadata**: No login or personal data is required.

## 📄 License
MIT
