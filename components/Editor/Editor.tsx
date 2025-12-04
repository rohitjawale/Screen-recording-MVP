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

  // Initialize diverse mock zoom events to demonstrate capabilities
  useEffect(() => {
     setZoomEvents([
       // 1. Mouse Click (Top Left Menu)
       { id: '1', type: 'click', startTime: 2, duration: 2.5, x: 0.15, y: 0.2, scale: 1.6 },
       
       // 2. Input Focus (Center-Left)
       { id: '2', type: 'focus', startTime: 6, duration: 3, x: 0.3, y: 0.5, scale: 1.8 },
       
       // 3. Drag Operation (Moving from Left to Right)
       // This event includes xEnd/yEnd to allow the camera to track the movement
       { id: '3', type: 'drag', startTime: 11, duration: 4, x: 0.2, y: 0.7, xEnd: 0.8, yEnd: 0.7, scale: 1.5 },
       
       // 4. Double Click (Bottom Right)
       { id: '4', type: 'double_click', startTime: 18, duration: 2, x: 0.85, y: 0.85, scale: 2.0 },
       
       // 5. Selection Highlight (Center Area)
       { id: '5', type: 'selection', startTime: 22, duration: 3, x: 0.5, y: 0.4, scale: 1.4 },
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
