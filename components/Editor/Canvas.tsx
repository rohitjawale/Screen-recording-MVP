import React, { useRef, useEffect, useState } from 'react';
import { EditorConfig, ZoomEvent } from '../../types';

interface CanvasProps {
  config: EditorConfig;
  videoUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  zoomEvents: ZoomEvent[];
}

// Easing functions
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

export const Canvas: React.FC<CanvasProps> = ({ 
  config, 
  videoUrl, 
  isPlaying, 
  onTimeUpdate,
  onDurationChange,
  videoRef,
  zoomEvents
}) => {
  
  // State for camera transformation
  // x, y are normalized 0-1 relative to the video frame
  // zoom is the scale factor
  const [cameraState, setCameraState] = useState({ x: 0.5, y: 0.5, zoom: 1 });
  
  const animationFrameRef = useRef<number>(0);

  // Animation Loop
  const animate = () => {
    if (videoRef.current && config.autoZoom) {
        const vid = videoRef.current;
        const currentTime = vid.currentTime;
        
        let targetX = 0.5;
        let targetY = 0.5;
        let targetZoom = 1;

        // Find relevant zoom events
        // 1. Anticipation (Pre-zoom) phase: Starts 200ms before event
        const preZoomEvent = zoomEvents.find(e => currentTime >= e.startTime - 0.2 && currentTime < e.startTime);
        
        // 2. Active Zoom phase: During the event
        const activeEvent = zoomEvents.find(e => currentTime >= e.startTime && currentTime < e.startTime + e.duration);
        
        // 3. Post-event (Release): A short window after event to zoom out smoothly? 
        // For now, we just default to center if no event.

        if (preZoomEvent) {
             // Anticipation Logic:
             // Zoom to 1.05x
             // Move slightly towards target?
             const t = (currentTime - (preZoomEvent.startTime - 0.2)) / 0.2; // 0 to 1
             const easedT = easeOutQuad(t);
             
             targetZoom = 1 + (0.05 * easedT); // 1.0 -> 1.05
             
             // Slightly drift camera towards target to hint direction
             targetX = 0.5 + (preZoomEvent.x - 0.5) * 0.1 * easedT;
             targetY = 0.5 + (preZoomEvent.y - 0.5) * 0.1 * easedT;
             
        } else if (activeEvent) {
             // Activation Logic:
             // Transition from 1.05 (or 1.0) to Target Scale
             // Duration of transition: ~350ms
             const transitionDuration = 0.35;
             const timeInEvent = currentTime - activeEvent.startTime;
             
             if (timeInEvent < transitionDuration) {
                 // Zooming In Phase
                 const t = timeInEvent / transitionDuration;
                 const easedT = easeOutBack(t); // Bounce effect
                 
                 // Start from 1.05 (if coming from pre-zoom)
                 const startZoom = 1.05; 
                 targetZoom = startZoom + (activeEvent.scale - startZoom) * easedT;
                 
                 // Pan to target
                 // We don't bounce position as much, just smooth ease
                 const posEasedT = easeOutQuad(t);
                 
                 // We need to lerp from wherever we were (likely center or pre-zoom drift) to target
                 // Approximation: Start from 0.5 (center) for simplicity in stateless anim
                 targetX = 0.5 + (activeEvent.x - 0.5) * posEasedT;
                 targetY = 0.5 + (activeEvent.y - 0.5) * posEasedT;

             } else {
                 // Held Phase
                 targetZoom = activeEvent.scale;
                 targetX = activeEvent.x;
                 targetY = activeEvent.y;
             }
        } else {
             // Idle / Zoom Out
             // We can check if we just finished an event to animate zoom out, 
             // but simpler for now is to just ease back to 1.0 continuously
             // We'll rely on CSS transition for the smooth "Zoom Out" when `autoZoom` is toggleable, 
             // but here we are setting state every frame.
             
             // Let's implement a simple "return to center" if no event matches
             targetZoom = 1;
             targetX = 0.5;
             targetY = 0.5;
             
             // If we want a smooth zoom out after event, we would need to track "last event end time".
             // For this MVP, let's assume direct mapping. 
             // To make it less jerky, we could lerp `cameraState` to target here manually.
             // But let's trust strict mapping for responsiveness first.
        }
        
        // --- Clamping Logic ---
        // We must ensure that the view never shows out-of-bounds (black bars)
        // Visible width in % = 1 / targetZoom
        // The center (x, y) must be confined so that the edges of visible area don't cross 0 or 1.
        
        // Half of visible dimension
        const halfVisibleW = 0.5 / targetZoom;
        const halfVisibleH = 0.5 / targetZoom;
        
        // Clamp X: [halfVisibleW, 1 - halfVisibleW]
        const clampedX = clamp(targetX, halfVisibleW, 1 - halfVisibleW);
        const clampedY = clamp(targetY, halfVisibleH, 1 - halfVisibleH);

        setCameraState({
            x: clampedX,
            y: clampedY,
            zoom: targetZoom
        });

    } else {
        // Reset if disabled
        setCameraState({ x: 0.5, y: 0.5, zoom: 1 });
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
  }, [isPlaying, config.autoZoom]); 
  
  // Handle seek updates for camera position
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      const vid = e.currentTarget;
      onTimeUpdate(vid.currentTime);
      
      if (!isPlaying && config.autoZoom) {
         // Run single frame calculation logic (duplicated for now from animate to ensure seek updates view)
         // For simplicity, just calling animate once would set state, but animate uses requestAnimationFrame.
         // Let's copy the pure state calculation logic or just force a re-render tick.
         // To stay DRY, we'll just run one tick of logic roughly:
         
         const currentTime = vid.currentTime;
         const activeEvent = zoomEvents.find(e => currentTime >= e.startTime && currentTime < e.startTime + e.duration);
         
         if (activeEvent) {
             const halfVisibleW = 0.5 / activeEvent.scale;
             const halfVisibleH = 0.5 / activeEvent.scale;
             setCameraState({
                 x: clamp(activeEvent.x, halfVisibleW, 1 - halfVisibleW),
                 y: clamp(activeEvent.y, halfVisibleH, 1 - halfVisibleH),
                 zoom: activeEvent.scale
             });
         } else {
             setCameraState({ x: 0.5, y: 0.5, zoom: 1 });
         }
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

  // Transform calculation
  // Translate formula for center-based pan: (0.5 - pos * Zoom) * 100%
  // But wait, if we clamped X/Y to be center, we can just use that.
  
  // Center of screen is 50%. 
  // We want the point `cameraState.x` (which is 0..1 on the video) to be at the center of the viewport.
  // CSS transform scale scales from center (or defined origin). 
  // Let's use transform-origin: 0 0 (Top Left) for easier math.
  // If Origin is 0,0:
  // To center point P(x,y) at Viewport Center (0.5, 0.5):
  // Translate = ViewportCenter - P_scaled
  // TranslateX = 0.5 - (x * zoom) (in units of width) -> * 100 %
  
  const translateX = (0.5 - cameraState.x * cameraState.zoom) * 100;
  const translateY = (0.5 - cameraState.y * cameraState.zoom) * 100;

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
                 // Use CSS transition for smooth zoom-out when event ends, 
                 // but disable it during event (since we manually animate via JS)
                 transition: (isPlaying && config.autoZoom) ? 'none' : 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)'
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
               
               {/* NOTE: Fake cursor removed as requested */}
             </div>
          </div>
       </div>
    </div>
  );
};
