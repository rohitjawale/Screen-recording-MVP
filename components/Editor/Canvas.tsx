import React, { useRef, useEffect, useState } from 'react';
import { EditorConfig, ZoomEvent } from '../../types';
import { MousePointerClick, TextCursor, Hand, Scan, MousePointer2 } from 'lucide-react';

interface CanvasProps {
  config: EditorConfig;
  videoUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  zoomEvents: ZoomEvent[];
}

// Easing functions for the Target Calculation
const easeOutBack = (x: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

const easeOutQuad = (x: number): number => {
    return 1 - (1 - x) * (1 - x);
};

// Clamp value between min and max
const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Linear Interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const Canvas: React.FC<CanvasProps> = ({ 
  config, 
  videoUrl, 
  isPlaying, 
  onTimeUpdate,
  onDurationChange,
  videoRef,
  zoomEvents
}) => {
  
  // State for rendering. We use state to trigger React re-renders which update the styles.
  const [cameraState, setCameraState] = useState({ x: 0.5, y: 0.5, zoom: 1 });
  const [activeEventType, setActiveEventType] = useState<ZoomEvent['type'] | null>(null);
  
  // Refs to hold the continuous value between frames to support smooth lerping
  const currentCamera = useRef({ x: 0.5, y: 0.5, zoom: 1 });
  
  const animationFrameRef = useRef<number>(0);

  // Get smoothing factor based on config
  const getLerpFactor = () => {
     switch(config.zoomSpeed) {
         case 'slow': return 0.03;
         case 'fast': return 0.15;
         default: return 0.08;
     }
  };

  // Animation Loop
  const animate = () => {
    if (videoRef.current && config.autoZoom) {
        const vid = videoRef.current;
        const currentTime = vid.currentTime;
        
        let targetX = 0.5;
        let targetY = 0.5;
        let targetZoom = 1;
        let currentEvent = null;

        // --- 1. Calculate TARGET state based on Timeline ---
        const preZoomEvent = zoomEvents.find(e => currentTime >= e.startTime - 0.2 && currentTime < e.startTime);
        const activeEvent = zoomEvents.find(e => currentTime >= e.startTime && currentTime < e.startTime + e.duration);

        if (preZoomEvent) {
             // Anticipation
             const t = (currentTime - (preZoomEvent.startTime - 0.2)) / 0.2; // 0 to 1
             const easedT = easeOutQuad(t);
             
             targetZoom = 1 + (0.05 * easedT); 
             // Slight drift
             targetX = 0.5 + (preZoomEvent.x - 0.5) * 0.1 * easedT;
             targetY = 0.5 + (preZoomEvent.y - 0.5) * 0.1 * easedT;
             
        } else if (activeEvent) {
             currentEvent = activeEvent;
             // Activation with Bounce
             const transitionDuration = 0.35;
             const timeInEvent = currentTime - activeEvent.startTime;
             
             // Dynamic Target Calculation (Supports Dragging)
             // If xEnd/yEnd exist, we interpolate the Target position over the duration of the event
             let eventTargetX = activeEvent.x;
             let eventTargetY = activeEvent.y;

             if (activeEvent.type === 'drag' && activeEvent.xEnd !== undefined && activeEvent.yEnd !== undefined) {
                 const dragProgress = Math.min(1, timeInEvent / activeEvent.duration);
                 // Linear drag for now, could be eased
                 eventTargetX = lerp(activeEvent.x, activeEvent.xEnd, dragProgress);
                 eventTargetY = lerp(activeEvent.y, activeEvent.yEnd, dragProgress);
             }

             if (timeInEvent < transitionDuration) {
                 // Zooming In Phase
                 const t = timeInEvent / transitionDuration;
                 const easedT = easeOutBack(t); // Bounce
                 
                 const startZoom = 1.05; 
                 targetZoom = startZoom + (activeEvent.scale - startZoom) * easedT;
                 
                 const posEasedT = easeOutQuad(t);
                 
                 // Interpolate from Center (0.5) to the Calculated Event Target
                 // Note: Ideally we interpolate from 'previous position' but 0.5 is a safe fallback for stateless logic
                 targetX = 0.5 + (eventTargetX - 0.5) * posEasedT;
                 targetY = 0.5 + (eventTargetY - 0.5) * posEasedT;

             } else {
                 // Held Phase
                 targetZoom = activeEvent.scale;
                 targetX = eventTargetX;
                 targetY = eventTargetY;
             }
        } else {
            // IDLE / Zoom Out Phase
            targetZoom = 1;
            targetX = 0.5;
            targetY = 0.5;
        }
        
        // --- 2. Clamp Target to avoid black bars ---
        // Ensure that the target focus point is valid given the current zoom.
        // The Viewport width in % is 1/Zoom.
        const halfVisibleW = 0.5 / targetZoom;
        const halfVisibleH = 0.5 / targetZoom;
        
        targetX = clamp(targetX, halfVisibleW, 1 - halfVisibleW);
        targetY = clamp(targetY, halfVisibleH, 1 - halfVisibleH);

        // --- 3. Interpolate Current towards Target (Smoothing) ---
        const factor = getLerpFactor();
        
        currentCamera.current.x = lerp(currentCamera.current.x, targetX, factor);
        currentCamera.current.y = lerp(currentCamera.current.y, targetY, factor);
        currentCamera.current.zoom = lerp(currentCamera.current.zoom, targetZoom, factor);
        
        // Update React State
        setCameraState({...currentCamera.current});
        setActiveEventType(currentEvent ? currentEvent.type : null);

    } else {
        // Reset if disabled
        setCameraState({ x: 0.5, y: 0.5, zoom: 1 });
        currentCamera.current = { x: 0.5, y: 0.5, zoom: 1 };
        setActiveEventType(null);
    }
    
    if (isPlaying) {
       animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  // Handle Play/Pause side effects
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
  }, [isPlaying, config.autoZoom, config.zoomSpeed]); 
  
  // Handle seek updates
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const vid = e.currentTarget;
      onTimeUpdate(vid.currentTime);
      
      if (!isPlaying && config.autoZoom) {
         const currentTime = vid.currentTime;
         const activeEvent = zoomEvents.find(e => currentTime >= e.startTime && currentTime < e.startTime + e.duration);
         const preZoomEvent = zoomEvents.find(e => currentTime >= e.startTime - 0.2 && currentTime < e.startTime);
         
         let targetX = 0.5, targetY = 0.5, targetZoom = 1;

         if (preZoomEvent) {
             targetZoom = 1.05;
             targetX = 0.5 + (preZoomEvent.x - 0.5) * 0.1;
             targetY = 0.5 + (preZoomEvent.y - 0.5) * 0.1;
         } else if (activeEvent) {
             targetZoom = activeEvent.scale;
             targetX = activeEvent.x;
             targetY = activeEvent.y;
             
             // Handle seek in drag event (snap to interpolated position)
             if (activeEvent.type === 'drag' && activeEvent.xEnd !== undefined && activeEvent.yEnd !== undefined) {
                 const timeInEvent = currentTime - activeEvent.startTime;
                 const dragProgress = Math.min(1, timeInEvent / activeEvent.duration);
                 targetX = lerp(activeEvent.x, activeEvent.xEnd, dragProgress);
                 targetY = lerp(activeEvent.y, activeEvent.yEnd, dragProgress);
             }
         }

         // Clamp
         const halfVisibleW = 0.5 / targetZoom;
         const halfVisibleH = 0.5 / targetZoom;
         targetX = clamp(targetX, halfVisibleW, 1 - halfVisibleW);
         targetY = clamp(targetY, halfVisibleH, 1 - halfVisibleH);

         // Update state directly (Snap)
         const newState = { x: targetX, y: targetY, zoom: targetZoom };
         setCameraState(newState);
         currentCamera.current = newState;
         setActiveEventType(activeEvent ? activeEvent.type : null);
      }
  };

  const getAspectRatioStyle = () => {
    switch (config.aspectRatio) {
      case '16:9': return { aspectRatio: '16/9', width: '100%', maxWidth: '800px' };
      case '1:1': return { aspectRatio: '1/1', height: '100%', maxHeight: '600px' };
      case '4:3': return { aspectRatio: '4/3', width: '100%', maxWidth: '700px' };
      case '9:16': return { aspectRatio: '9/16', height: '100%', maxHeight: '700px' };
      default: return { width: 'auto', height: 'auto', maxWidth: '90%' };
    }
  };

  const translateX = (0.5 - cameraState.x * cameraState.zoom) * 100;
  const translateY = (0.5 - cameraState.y * cameraState.zoom) * 100;

  // Icon Helper
  const EventIcon = () => {
      switch(activeEventType) {
          case 'click':
          case 'double_click': return <MousePointerClick className="text-orange-500 drop-shadow-lg" size={32} />;
          case 'focus': return <TextCursor className="text-blue-500 drop-shadow-lg" size={32} />;
          case 'drag': return <Hand className="text-pink-500 drop-shadow-lg" size={32} />;
          case 'selection': return <Scan className="text-green-500 drop-shadow-lg" size={32} />;
          default: return null;
      }
  };

  return (
    <div className="flex-1 bg-[#121212] overflow-hidden flex items-center justify-center relative">
       {/* Background */}
       <div className="absolute inset-0 opacity-[0.05]" 
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
       </div>

       {/* Canvas Container */}
       <div 
         id="export-canvas"
         className="relative flex items-center justify-center transition-all duration-500 ease-in-out shadow-2xl overflow-hidden"
         style={{
            ...getAspectRatioStyle(),
            background: config.background,
            padding: `${config.padding}px`,
         }}
       >
          {/* Content Wrapper */}
          <div 
             className="relative overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
             style={{
               borderRadius: `${config.roundness}px`,
               boxShadow: `0 ${config.shadow}px ${config.shadow * 2}px rgba(0,0,0,${config.shadow > 0 ? 0.3 : 0})`,
             }}
          >
             {/* Zoom / Pan Layer */}
             <div 
               className="w-full h-full will-change-transform"
               style={{
                 transformOrigin: '0 0',
                 transform: `translate(${translateX}%, ${translateY}%) scale(${cameraState.zoom})`,
                 transition: 'none' 
               }}
             >
               <video
                 ref={videoRef}
                 src={videoUrl}
                 className="block w-full h-full object-contain bg-black"
                 onTimeUpdate={handleTimeUpdate}
                 onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
                 playsInline
                 loop
                 muted={false} 
               />
               
               {/* Event Type Indicator Overlay (Subtle) */}
               {config.autoZoom && activeEventType && (
                   <div className="absolute top-4 right-4 z-20 animate-fade-in opacity-80 scale-[1]">
                       <div className="bg-black/50 backdrop-blur-sm p-2 rounded-full border border-white/10">
                           <EventIcon />
                       </div>
                   </div>
               )}
             </div>
          </div>
       </div>
    </div>
  );
};
