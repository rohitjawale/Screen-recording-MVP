import React, { useState, useRef } from 'react';
import { AppState, VideoMetadata } from './types';
import { StartScreen } from './components/StartScreen';
import { RecordingOverlay } from './components/RecordingOverlay';
import { ProcessingScreen } from './components/ProcessingScreen';
import { Editor } from './components/Editor/Editor';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);

  const startRecording = async (withAudio: boolean) => {
    try {
      // 1. Get Screen Stream (Video + System Audio)
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true 
      });

      // 2. Prepare Final Stream
      let finalStream = displayStream;

      // 3. If Mic Audio Requested, merge tracks
      if (withAudio) {
         try {
           const audioStream = await navigator.mediaDevices.getUserMedia({
             audio: true,
             video: false
           });
           
           // Combine tracks: Screen Video + Screen Audio + Mic Audio
           const tracks = [
             ...displayStream.getVideoTracks(),
             ...displayStream.getAudioTracks(),
             ...audioStream.getAudioTracks()
           ];
           finalStream = new MediaStream(tracks);
         } catch (e) {
           console.warn("Microphone access failed or denied. Continuing with system audio only.", e);
         }
      }

      activeStreamRef.current = finalStream;

      // 4. Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
        ? 'video/webm; codecs=vp9' 
        : 'video/webm';

      const recorder = new MediaRecorder(finalStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
         finalizeRecording();
      };
      
      // Stop if user clicks "Stop Sharing" in browser UI
      displayStream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      recorder.start(1000);
      setAppState(AppState.RECORDING);

    } catch (err) {
      console.error("Error starting recording:", err);
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        alert(`Failed to start recording: ${err.message}`);
      }
      cleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const finalizeRecording = () => {
    setAppState(AppState.PROCESSING);

    // Give a moment for last chunks to arrive
    setTimeout(() => {
        const blob = new Blob(chunks.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        cleanup();

        setVideoMetadata({
            blob,
            url,
            duration: 0, // Will be determined by video element on load
        });
        
        setAppState(AppState.EDITING);
    }, 1000);
  };

  const cleanup = () => {
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach(track => track.stop());
        activeStreamRef.current = null;
      }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.pause();
    setIsPaused(true);
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === 'paused') mediaRecorderRef.current.resume();
    setIsPaused(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {appState === AppState.IDLE && (
        <StartScreen onStartRecording={startRecording} />
      )}

      {appState === AppState.RECORDING && (
        <>
          <div className="fixed inset-0 bg-transparent pointer-events-none z-50">
             <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 pointer-events-auto">
                <p className="text-gray-200 text-sm font-medium">Recording... Switch to your target tab.</p>
             </div>

             <div className="pointer-events-auto">
                 <RecordingOverlay 
                   onStop={stopRecording} 
                   onPause={pauseRecording}
                   onResume={resumeRecording}
                   isPaused={isPaused}
                 />
             </div>
          </div>
        </>
      )}

      {appState === AppState.PROCESSING && <ProcessingScreen />}

      {appState === AppState.EDITING && videoMetadata && (
        <Editor videoMetadata={videoMetadata} />
      )}
    </div>
  );
}