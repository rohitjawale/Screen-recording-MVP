import React, { useRef, useState, useEffect } from 'react';
import { GripVertical } from 'lucide-react';

interface CameraBubbleProps {
  stream: MediaStream;
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export const CameraBubble: React.FC<CameraBubbleProps> = ({ stream, position, onPositionChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
    // Important to prevent text selection or other events while dragging
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      onPositionChange({
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
  }, [isDragging, onPositionChange]);

  return (
    <div
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 10000,
        width: '200px',
        height: '200px',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="group"
      onMouseDown={handleMouseDown}
    >
      <div className="relative w-full h-full pointer-events-none">
        {/* Drag Handle (Visual affordance) */}
        <div 
          className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-auto flex items-center gap-2"
        >
          <GripVertical size={14} />
          <span className="text-xs font-medium">Drag</span>
        </div>

        {/* Circular Video Bubble */}
        <div className="w-full h-full rounded-full overflow-hidden border-[4px] border-white shadow-2xl bg-black relative transform transition-transform duration-300 group-hover:scale-105 group-active:scale-95">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />
        </div>
        
        {/* Active State Ring */}
        <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
      </div>
    </div>
  );
};