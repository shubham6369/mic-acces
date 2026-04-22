import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import { 
  Mic, 
  Volume2, 
  VolumeX, 
  Radio, 
  Copy, 
  Check, 
  Wifi, 
  WifiOff,
  Power,
  Activity,
  Headphones,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

// --- Types ---
type Mode = 'idle' | 'broadcast' | 'listen';

// --- Components ---

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('idle');
  const [peerId, setPeerId] = useState<string>('');
  const [remoteId, setRemoteId] = useState<string>('');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Initialize Peer with optional custom ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    
    const urlMode = params.get('mode');
    const myId = (urlMode === 'broadcast' && room) ? room : null;

    const peer = myId ? new Peer(myId) : new Peer();
    peerRef.current = peer;

    peer.on('open', (id) => {
      setPeerId(id);
      setStatus('disconnected');
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      if (err.type === 'unavailable-id') {
        setError('This room is already occupied. Try a different name.');
      } else {
        setError(`Connection Error: ${err.type}`);
      }
    });

    return () => {
      peer.destroy();
    };
  }, []);

  // Handle Incoming Calls
  useEffect(() => {
    if (!peerRef.current) return;

    peerRef.current.on('call', (call) => {
      if (mode === 'listen') {
        call.answer();
        call.on('stream', (remoteStream) => {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play().catch(_e => {
              console.error('Autoplay blocked');
              setError('Click anywhere to enable audio');
            });
            setStatus('connected');
          }
        });
      } else if (mode === 'broadcast' && localStreamRef.current) {
        call.answer(localStreamRef.current);
        setStatus('connected');
      }
    });
  }, [mode]);

  // Handle URL Parameters for easy sharing
  useEffect(() => {
    if (!peerId) return;

    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode');
    const room = params.get('room');

    if (urlMode === 'broadcast') {
      startBroadcasting();
    } else if (urlMode === 'listen' && room) {
      setRemoteId(room);
      setMode('listen');
      // Auto-connect after a short delay to ensure peer is fully ready
      setTimeout(() => {
        if (peerRef.current) {
          const call = peerRef.current.call(room, new MediaStream());
          call.on('stream', (remoteStream) => {
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
              remoteAudioRef.current.play().catch(_e => {
                setError('Please click the screen to enable audio');
              });
              setStatus('connected');
              confetti({ particleCount: 100 });
            }
          });
        }
      }, 1000);
    }
  }, [peerId]);

  // Screen Wake Lock
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err: any) {
        console.error(`${err.name}, ${err.message}`);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // Start Broadcasting
  const startBroadcasting = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setMode('broadcast');
      setStatus('disconnected');
      requestWakeLock();
      
      // Setup Audio Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyzer = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);
      analyzer.fftSize = 64;
      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;

    } catch (err) {
      console.error('Failed to get mic:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stop = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    releaseWakeLock();
    setMode('idle');
    setStatus('disconnected');
    setError(null);
  };

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Visualizer Animation
  const [bars, setBars] = useState<number[]>(new Array(16).fill(10));
  useEffect(() => {
    if (!analyzerRef.current || mode === 'idle') return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    const update = () => {
      if (!analyzerRef.current) return;
      analyzerRef.current.getByteFrequencyData(dataArray);
      const newBars = Array.from(dataArray.slice(0, 16)).map(v => Math.max(4, (v / 255) * 50));
      setBars(newBars);
      requestAnimationFrame(update);
    };
    update();
  }, [mode]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-8 flex flex-col gap-8 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-600/20 blur-[100px] rounded-full" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-rose-600/20 blur-[100px] rounded-full" />

        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <Mic className="text-indigo-400" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">MicLive</h1>
              <p className="text-sm text-gray-400 font-medium">24/7 Audio Monitor</p>
            </div>
          </div>
          <AnimatePresence>
            {status !== 'disconnected' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`status-badge ${status === 'connected' ? 'status-online' : 'status-offline'}`}
              >
                {status === 'connected' ? <Wifi size={14} /> : <WifiOff size={14} />}
                {status === 'connected' ? 'Live' : 'Linking...'}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <AnimatePresence mode="wait">
          {mode === 'idle' && (
            <motion.div 
              key="idle"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-6"
            >
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Your Device ID</span>
                    <p className="font-mono text-sm text-indigo-300">{peerId || 'Generating...'}</p>
                  </div>
                  <button 
                    onClick={copyId}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                  >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button onClick={startBroadcasting} className="btn-primary flex-col h-32 gap-3">
                    <Radio size={32} />
                    <span>Broadcast</span>
                  </button>
                  <button onClick={() => setMode('listen')} className="btn-secondary flex-col h-32 gap-3 border-dashed">
                    <Headphones size={32} />
                    <span>Listen Mode</span>
                  </button>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                <Info size={18} className="text-indigo-400 shrink-0" />
                <p className="text-xs text-gray-400 leading-relaxed">
                  Use Broadcast mode on the source phone and Listen mode on your current device.
                </p>
              </div>
            </motion.div>
          )}

          {mode === 'broadcast' && (
            <motion.div 
              key="broadcast"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center gap-8 py-4"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full" />
                <div className="relative w-32 h-32 glass-card rounded-full flex items-center justify-center border-rose-500/30">
                  <Mic size={48} className="text-rose-400" />
                  <div className="absolute -top-2 -right-2 on-air-pulse" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Broadcasting Live</h3>
                <p className="text-sm text-gray-400">Share your ID to let others listen</p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-lg border border-white/10 mt-2">
                  <span className="font-mono text-indigo-300">{peerId}</span>
                  <button onClick={copyId} className="text-gray-500 hover:text-white">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="visualizer-container w-full max-w-[200px]">
                {bars.map((height, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: `${height}px` }}
                    className="visualizer-bar bg-rose-500/60"
                  />
                ))}
              </div>

              <button onClick={stop} className="btn-danger w-full">
                <Power size={20} />
                Stop Session
              </button>
            </motion.div>
          )}

          {mode === 'listen' && (
            <motion.div 
              key="listen"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6"
            >
              {status === 'disconnected' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1">Connect to Broadcaster</label>
                    <input 
                      type="text" 
                      placeholder="Enter Device ID..." 
                      className="w-full"
                      value={remoteId}
                      onChange={(e) => setRemoteId(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMode('idle')} className="btn-secondary">Cancel</button>
                    <button onClick={startListening} className="btn-primary">Connect</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-8 py-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full" />
                    <div className="relative w-32 h-32 glass-card rounded-full flex items-center justify-center border-indigo-500/30">
                      <Headphones size={48} className="text-indigo-400" />
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Listening Now</h3>
                    <p className="text-sm text-gray-400">Low-latency live stream active</p>
                  </div>

                  <div className="w-full space-y-4">
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                      <button onClick={() => setIsMuted(!isMuted)} className="text-gray-400 hover:text-white transition-colors">
                        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="flex-1 accent-indigo-500"
                      />
                    </div>
                    <button onClick={stop} className="btn-secondary w-full text-rose-400 border-rose-500/20 hover:bg-rose-500/10">
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2"
          >
            <Activity size={14} />
            {error}
          </motion.div>
        )}

        <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      </motion.div>
      
      <footer className="mt-8 text-gray-500 text-xs flex items-center gap-4">
        <p>© 2026 MicLive Security</p>
        <span className="w-1 h-1 bg-gray-700 rounded-full" />
        <p>End-to-End Encrypted</p>
        <span className="w-1 h-1 bg-gray-700 rounded-full" />
        <p>Peer-to-Peer</p>
      </footer>
    </div>
  );
};

export default App;
