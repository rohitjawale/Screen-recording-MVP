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
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async (withAudio: boolean) => {
    try {
      // 1. Get Display Media (Screen)
      // We use simplified constraints to ensure the dialog opens on all devices/browsers.
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser", 
        },
        audio: true 
      });

      // 2. Optional: Get Microphone
      let finalStream = displayStream;
      if (withAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Combine tracks: Keep all video tracks from screen, add audio tracks from mic
          // Note: If displayStream has system audio, we might have multiple audio tracks.
          finalStream = new MediaStream([
            ...displayStream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
            ...displayStream.getAudioTracks() // Include system audio if picked
          ]);
        } catch (err) {
          console.warn("Microphone access denied or failed", err);
        }
      }

      streamRef.current = finalStream;
      
      // 3. Setup Recorder
      // Check for supported mime types to prevent crashes on Safari/Firefox
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
        ? 'video/webm; codecs=vp9' 
        : 'video/webm';

      const recorder = new MediaRecorder(finalStream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Create Blob
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Transition to Processing
        setAppState(AppState.PROCESSING);
        
        // Simulate Processing Delay for UX
        setTimeout(() => {
          setVideoMetadata({
            blob,
            url,
            duration: 0 // Will be set by video element
          });
          setAppState(AppState.EDITING);
        }, 2000);
        
        // Cleanup tracks
        streamRef.current?.getTracks().forEach(track => track.stop());
      };

      // Detect if user stops via browser UI (e.g. the floating browser "Stop Sharing" bar)
      const videoTrack = displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          // Only stop if we are currently recording or paused (not already processing)
          // We check the ref directly to avoid closure stale state issues
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            stopRecording();
          }
        };
      }

      recorder.start();
      setAppState(AppState.RECORDING);

    } catch (err) {
      console.error("Error starting recording:", err);
      // If the error is NotAllowedError, it usually means the user cancelled the dialog 
      // OR the iframe permission is missing. 
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        alert(`Failed to start recording: ${err.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {appState === AppState.IDLE && (
        <StartScreen onStartRecording={startRecording} />
      )}

      {appState === AppState.RECORDING && (
        <>
          {/* Overlay renders inside the app. 
              Note: This overlay is only visible if the user looks at this specific tab/window. 
              Actual screen recording continues in background. */}
          <div className="fixed inset-0 bg-white/80 flex flex-col items-center justify-center text-gray-800 z-50">
             <div className="mb-8 text-center animate-pulse">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Recording in Progress</h1>
                <p className="text-gray-500">Go to your selected tab. This overlay controls the recording.</p>
             </div>
             <RecordingOverlay 
               onStop={stopRecording} 
               onPause={pauseRecording}
               onResume={resumeRecording}
               isPaused={isPaused}
             />
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