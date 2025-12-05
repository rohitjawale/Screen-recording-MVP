import React, { useState, useRef, useEffect } from 'react';
import { EditorConfig, VideoMetadata, DEFAULT_EDITOR_CONFIG, ZoomEvent, OverlayItem, OverlayType, CropState } from '../../types';
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
  const [trimRange, setTrimRange] = useState({ start: 0, end: 0 });
  
  // New State for features
  const [overlays, setOverlays] = useState<OverlayItem[]>([]);
  const [activeOverlayId, setActiveOverlayId] = useState<string | null>(null);
  const [cropState, setCropState] = useState<CropState>({ active: false, x: 0, y: 0, width: 1, height: 1 });

  const [zoomEvents, setZoomEvents] = useState<ZoomEvent[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize diverse mock zoom events to demonstrate capabilities
  useEffect(() => {
     setZoomEvents([
       { id: '1', type: 'click', startTime: 2, duration: 2.5, x: 0.15, y: 0.2, scale: 1.6 },
       { id: '2', type: 'focus', startTime: 6, duration: 3, x: 0.3, y: 0.5, scale: 1.8 },
       { id: '3', type: 'drag', startTime: 11, duration: 4, x: 0.2, y: 0.7, xEnd: 0.8, yEnd: 0.7, scale: 1.5 },
       { id: '4', type: 'double_click', startTime: 18, duration: 2, x: 0.85, y: 0.85, scale: 2.0 },
       { id: '5', type: 'selection', startTime: 22, duration: 3, x: 0.5, y: 0.4, scale: 1.4 },
     ]);
  }, []);

  const handleDurationChange = (d: number) => {
      setDuration(d);
      // Initialize trim range if not set (or if end is 0)
      if (trimRange.end === 0) {
          setTrimRange({ start: 0, end: d });
      }
  };

  const handleSeek = (time: number) => {
    if (!Number.isFinite(time)) return;
    
    // Clamp seek to duration
    const clampedTime = Math.max(0, Math.min(time, duration));

    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime;
    }
    setCurrentTime(clampedTime);
  };

  const handleAddOverlay = (type: OverlayType) => {
      setIsPlaying(false); // Pause when adding overlay to allow editing
      const newOverlay: OverlayItem = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          startTime: currentTime,
          duration: 3, // Default 3s duration
          x: 0.35,
          y: 0.35,
          width: 0.3,
          height: 0.3
      };
      setOverlays([...overlays, newOverlay]);
      setActiveOverlayId(newOverlay.id);
  };

  const handleUpdateOverlay = (id: string, updates: Partial<OverlayItem>) => {
      setOverlays(overlays.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const handleDeleteOverlay = (id: string) => {
      setOverlays(overlays.filter(o => o.id !== id));
      if (activeOverlayId === id) setActiveOverlayId(null);
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
           <span className="text-xs text-gray-400 font-medium">Project: Screen Recording</span>
           <div className="flex gap-4 text-xs text-gray-500">
             <span>Auto-saved</span>
           </div>
        </header>

        <Canvas 
          config={config} 
          videoUrl={videoMetadata.url}
          isPlaying={isPlaying}
          onTimeUpdate={setCurrentTime}
          onDurationChange={handleDurationChange}
          videoRef={videoRef}
          zoomEvents={zoomEvents}
          trimRange={trimRange}
          overlays={overlays}
          activeOverlayId={activeOverlayId}
          onUpdateOverlay={handleUpdateOverlay}
          onSelectOverlay={setActiveOverlayId}
          cropState={cropState}
          onUpdateCrop={setCropState}
        />
        
        <Timeline 
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          zoomEvents={zoomEvents}
          trimRange={trimRange}
          onTrimChange={setTrimRange}
          onAddOverlay={handleAddOverlay}
          overlays={overlays}
          onUpdateOverlay={handleUpdateOverlay}
          activeOverlayId={activeOverlayId}
          onSelectOverlay={setActiveOverlayId}
          cropState={cropState}
          onToggleCrop={() => setCropState(prev => ({ ...prev, active: !prev.active }))}
        />
      </div>
    </div>
  );
};