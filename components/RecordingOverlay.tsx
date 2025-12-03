import React, { useState, useEffect, useRef } from 'react';
import { Pause, Square, GripVertical, Play } from 'lucide-react';

interface RecordingOverlayProps {
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  isPaused: boolean;
}

export const RecordingOverlay: React.FC<RecordingOverlayProps> = ({ onStop, onPause, onResume, isPaused }) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (!isPaused) {
      interval = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPaused]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      style={{ 
        position: 'fixed', 
        left: position.x, 
        top: position.y,
        zIndex: 9999
      }}
      className="flex items-center gap-4 bg-gray-900/90 backdrop-blur-md px-4 py-3 rounded-full border border-white/10 shadow-2xl animate-fade-in"
    >
      {/* Drag Handle */}
      <div 
        onMouseDown={handleMouseDown}
        className="cursor-move text-gray-500 hover:text-white transition-colors"
      >
        <GripVertical size={16} />
      </div>

      {/* Recording Indicator */}
      <div className="flex items-center gap-2 min-w-[60px]">
        <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse'}`} />
        <span className="text-white font-mono text-sm font-medium tracking-wide">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/20" />

      {/* Controls */}
      <div className="flex items-center gap-2">
        {!isPaused ? (
          <button 
            onClick={onPause}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            title="Pause"
          >
            <Pause size={18} fill="currentColor" />
          </button>
        ) : (
          <button 
            onClick={onResume}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
            title="Resume"
          >
            <Play size={18} fill="currentColor" />
          </button>
        )}

        <button 
          onClick={onStop}
          className="group flex items-center justify-center w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full transition-all shadow-lg shadow-red-500/20"
          title="Stop Recording"
        >
          <Square size={14} fill="currentColor" className="text-white" />
        </button>
      </div>
    </div>
  );
};