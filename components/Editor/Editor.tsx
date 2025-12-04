import React, { useState, useRef, useEffect } from 'react';
import { EditorConfig, VideoMetadata, DEFAULT_EDITOR_CONFIG, ZoomEvent } from '../../types';
import { Sidebar } from './Sidebar';
import { Canvas } from './Canvas';
import { Timeline } from './Timeline';

interface EditorProps {
  videoMetadata: VideoMetadata;
}

export const Editor: React.FC<EditorProps> = ({ videoMetadata }) => {
  const [config, setConfig] = useState<EditorConfig>(DEFAULT_EDITOR_CONFIG);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [zoomEvents, setZoomEvents] = useState<ZoomEvent[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize some mock zoom events once metadata is loaded or just on mount
  // In a real app, these would be detected via CV or passed from recording metadata
  useEffect(() => {
     setZoomEvents([
       { id: '1', startTime: 2, duration: 3, x: 0.2, y: 0.3, scale: 1.5 },
       { id: '2', startTime: 8, duration: 4, x: 0.8, y: 0.7, scale: 1.6 },
       { id: '3', startTime: 15, duration: 2.5, x: 0.5, y: 0.5, scale: 1.4 },
     ]);
  }, []);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleExport = () => {
    alert("In a real app, this would trigger a canvas rendering pipeline (using MediaRecorder on a canvas element) to download the composited video.");
  };

  return (
    <div className="flex h-screen w-full bg-black text-white font-sans overflow-hidden">
      <Sidebar 
        config={config} 
        onChange={setConfig} 
        onExport={handleExport}
      />
      
      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="h-10 border-b border-white/5 bg-[#1E1E1E] flex items-center px-4 justify-between select-none">
           <span className="text-xs text-gray-400 font-medium">Project: Untitled Recording</span>
           <div className="flex gap-4 text-xs text-gray-500">
             <span>Auto-saved</span>
           </div>
        </header>

        <Canvas 
          config={config} 
          videoUrl={videoMetadata.url}
          isPlaying={isPlaying}
          onTimeUpdate={setCurrentTime}
          onDurationChange={setDuration}
          videoRef={videoRef}
          zoomEvents={zoomEvents}
        />
        
        <Timeline 
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          zoomEvents={zoomEvents}
        />
      </div>
    </div>
  );
};
