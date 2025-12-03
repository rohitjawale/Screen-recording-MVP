import React, { useRef, useEffect, useState } from 'react';
import { EditorConfig } from '../../types';

interface CanvasProps {
  config: EditorConfig;
  videoUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

// Simple seeded random for deterministic "random" positions based on timeline index
const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

export const Canvas: React.FC<CanvasProps> = ({ 
  config, 
  videoUrl, 
  isPlaying, 
  onTimeUpdate,
  onDurationChange,
  videoRef
}) => {
  
  // State for simulated cursor/camera position (normalized 0..1)
  const [camPos, setCamPos] = useState({ x: 0.5, y: 0.5 });
  const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 });
  
  // Ref to track requestAnimationFrame
  const animationFrameRef = useRef<number>(0);

  // Define "Interest Points" (Keyframes) for the simulation
  // In a real app, these would come from recorded click events
  const generateKeyframes = () => {
      // Create some fake interest points
      return [
          { t: 0, x: 0.5, y: 0.5 }, // Start Center
          { t: 0.15, x: 0.2, y: 0.2 }, // Top Left (Mock Menu)
          { t: 0.30, x: 0.8, y: 0.3 }, // Top Right
          { t: 0.50, x: 0.5, y: 0.8 }, // Bottom Center
          { t: 0.70, x: 0.2, y: 0.6 }, // Left-ish
          { t: 0.90, x: 0.8, y: 0.8 }, // Bottom Right (Mock Submit)
          { t: 1.0, x: 0.5, y: 0.5 }, // End Center
      ];
  };
  const keyframes = useRef(generateKeyframes());

  // Function to get target position at a specific progress (0..1)
  const getTargetPosition = (progress: number) => {
      const frames = keyframes.current;
      // Find current segment
      for (let i = 0; i < frames.length - 1; i++) {
          if (progress >= frames[i].t && progress <= frames[i+1].t) {
              const start = frames[i];
              const end = frames[i+1];
              const segmentProgress = (progress - start.t) / (end.t - start.t);
              
              // Simple Ease-in-out interpolation
              const ease = segmentProgress < 0.5 
                  ? 2 * segmentProgress * segmentProgress 
                  : 1 - Math.pow(-2 * segmentProgress + 2, 2) / 2;

              return {
                  x: start.x + (end.x - start.x) * ease,
                  y: start.y + (end.y - start.y) * ease
              };
          }
      }
      return frames[frames.length - 1]; // Fallback to last frame
  };

  // Animation Loop
  const animate = () => {
    if (videoRef.current && config.autoZoom) {
        const vid = videoRef.current;
        const progress = vid.duration > 0 ? vid.currentTime / vid.duration : 0;
        
        // 1. Calculate Target (Simulated Cursor)
        const target = getTargetPosition(progress);
        
        // 2. Smooth "Camera" Follow
        // We lerp current camera position towards target with a "lag" for natural feel
        // However, updating state every frame triggers re-renders. 
        // For 60fps React, this is okay if component is light, but ideally we'd update refs and use direct DOM manipulation.
        // For this MVP, let's update state but maybe throttle or accept the React overhead (it's small here).
        // Actually, to ensure sync, let's just set it directly to target or a slightly lagged version.
        
        // Let's just use the interpolated target directly for now for instant responsiveness 
        // effectively treating the "keyframe interpolation" as the smooth path.
        setCursorPos(target);
        setCamPos(target);
    } else {
        // Reset to center if autozoom off
        setCamPos({ x: 0.5, y: 0.5 });
        setCursorPos({ x: 0.5, y: 0.5 });
    }
    
    if (isPlaying) {
       animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  // Handle Play/Pause side effects from parent state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.error("Play failed", e));
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        videoRef.current.pause();
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, config.autoZoom]); 
  
  // Also run animation logic once on seek (time update) even if paused, to update camera position
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const vid = e.currentTarget;
      onTimeUpdate(vid.currentTime);
      
      if (!isPlaying && config.autoZoom) {
         // Manual update when scrubbing
         const progress = vid.duration > 0 ? vid.currentTime / vid.duration : 0;
         const target = getTargetPosition(progress);
         setCamPos(target);
         setCursorPos(target);
      }
  };

  const getAspectRatioStyle = () => {
    switch (config.aspectRatio) {
      case '16:9': return { aspectRatio: '16/9', width: '100%', maxWidth: '800px' };
      case '1:1': return { aspectRatio: '1/1', height: '100%', maxHeight: '600px' };
      case '4:3': return { aspectRatio: '4/3', width: '100%', maxWidth: '700px' };
      case '9:16': return { aspectRatio: '9/16', height: '100%', maxHeight: '700px' };
      default: return { width: 'auto', height: 'auto', maxWidth: '90%' }; // Original
    }
  };

  // Zoom Level - if autozoom is on, we use a fixed high zoom (e.g. 1.5x or 2x) or user defined?
  // User config has `zoom` (number) but it defaults to 1.
  // Let's assume AutoZoom implies a specific "active" zoom level, say 1.6x, or uses config.zoom if user adjusted it.
  // For this demo, let's enforce a nice zoom level when autoZoom is on.
  const activeZoom = config.autoZoom ? 1.6 : 1;

  // Calculate Transform
  // We want point (camPos.x, camPos.y) to be at the center of the viewport (0.5, 0.5)
  // Standard CSS Transform Origin 0 0 means coordinates are from top-left.
  // Translate formula: (0.5 - pos * Zoom) * 100%
  const translateX = (0.5 - camPos.x * activeZoom) * 100;
  const translateY = (0.5 - camPos.y * activeZoom) * 100;
  
  // We clamp values to prevent showing whitespace if we pan too far?
  // No, FocuSee style allows showing edges if padding exists, but usually tries to stay within bounds if possible.
  // For MVP simple logic:
  // transform: translate(X%, Y%) scale(Zoom)
  
  return (
    <div className="flex-1 bg-[#121212] overflow-hidden flex items-center justify-center relative">
       {/* Dot Grid Background for Editor Area */}
       <div className="absolute inset-0 opacity-[0.05]" 
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
       </div>

       {/* The "Exportable" Area Container */}
       <div 
         id="export-canvas"
         className="relative flex items-center justify-center transition-all duration-500 ease-in-out shadow-2xl overflow-hidden"
         style={{
            ...getAspectRatioStyle(),
            background: config.background,
            padding: `${config.padding}px`,
         }}
       >
          {/* Video Container with User Styles */}
          <div 
             className="relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
             style={{
               borderRadius: `${config.roundness}px`,
               boxShadow: `0 ${config.shadow}px ${config.shadow * 2}px rgba(0,0,0,${config.shadow > 0 ? 0.3 : 0})`,
             }}
          >
             {/* 
                Wrapper for simulated zoom. 
                Using style transform for performant updates.
             */}
             <div 
               className="w-full h-full will-change-transform"
               style={{
                 transformOrigin: '0 0',
                 transform: `translate(${translateX}%, ${translateY}%) scale(${activeZoom})`,
                 transition: isPlaying ? 'none' : 'transform 0.3s ease-out' // Smooth transition when seeking, instant when playing
               }}
             >
               <video
                 ref={videoRef}
                 src={videoUrl}
                 className="block max-w-full max-h-full object-contain bg-black w-full h-full"
                 onTimeUpdate={handleTimeUpdate}
                 onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
                 playsInline
                 loop
                 muted={false} 
               />
               
               {/* Simulated Cursor Overlay */}
               {config.autoZoom && (
                 <div 
                    className="absolute w-8 h-8 pointer-events-none z-10 transition-opacity duration-300"
                    style={{
                        left: `${cursorPos.x * 100}%`,
                        top: `${cursorPos.y * 100}%`,
                        transform: 'translate(-50%, -50%)'
                    }}
                 >
                   {/* Cursor Circle */}
                   <div className="w-full h-full rounded-full border-[3px] border-yellow-400 bg-yellow-400/20 blur-[1px] shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse" />
                   
                   {/* Mouse Pointer Icon Simulation */}
                   <svg className="absolute top-1/2 left-1/2 w-4 h-4 text-white drop-shadow-md" 
                        style={{ transform: 'translate(20%, 20%)' }} // Offset slightly from center of circle
                        viewBox="0 0 24 24" fill="currentColor" stroke="none">
                        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z" />
                   </svg>
                 </div>
               )}
             </div>
          </div>

          {/* Optional: Watermark or Decor */}
          <div className="absolute bottom-6 right-6 opacity-30 pointer-events-none mix-blend-overlay">
             <span className="text-white font-bold text-lg tracking-widest">REC</span>
          </div>
       </div>
    </div>
  );
};