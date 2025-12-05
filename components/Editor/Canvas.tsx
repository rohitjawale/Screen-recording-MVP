import React, { useRef, useEffect, useState } from 'react';
import { EditorConfig, ZoomEvent, OverlayItem, CropState } from '../../types';
import { MousePointerClick, TextCursor, Hand, Scan } from 'lucide-react';

interface CanvasProps {
  config: EditorConfig;
  videoUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  zoomEvents: ZoomEvent[];
  trimRange: { start: number; end: number };
  
  // New props
  overlays: OverlayItem[];
  activeOverlayId: string | null;
  onUpdateOverlay: (id: string, updates: Partial<OverlayItem>) => void;
  onSelectOverlay: (id: string | null) => void;
  cropState: CropState;
  onUpdateCrop: (state: CropState) => void;
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

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export const Canvas: React.FC<CanvasProps> = ({ 
  config, 
  videoUrl, 
  isPlaying, 
  onTimeUpdate,
  onDurationChange,
  videoRef,
  zoomEvents,
  trimRange,
  overlays,
  activeOverlayId,
  onUpdateOverlay,
  onSelectOverlay,
  cropState,
  onUpdateCrop
}) => {
  
  const [cameraState, setCameraState] = useState({ x: 0.5, y: 0.5, zoom: 1 });
  const [activeEventType, setActiveEventType] = useState<ZoomEvent['type'] | null>(null);
  const currentCamera = useRef({ x: 0.5, y: 0.5, zoom: 1 });
  const animationFrameRef = useRef<number>(0);
  
  // Drag State for Overlays/Crop
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'crop_resize' | 'crop_move';
    targetId?: string;
    handle?: string; // tl, tr, bl, br
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  // Sync Video Playback
  useEffect(() => {
    const screenVid = videoRef.current;
    if (isPlaying) {
      if (screenVid) {
         if (screenVid.currentTime >= trimRange.end) {
             screenVid.currentTime = trimRange.start;
         } else if (screenVid.currentTime < trimRange.start) {
             screenVid.currentTime = trimRange.start;
         }
         screenVid.play().catch(e => console.warn("Screen play failed", e));
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (screenVid) {
          screenVid.pause();
          // Snap to correct camera state when pausing to prevent drift/reset
          const { x, y, zoom, eventType } = calculateTargetCamera(screenVid.currentTime);
          setCameraState({ x, y, zoom });
          currentCamera.current = { x, y, zoom };
          setActiveEventType(eventType);
      }
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying]);

  const getLerpFactor = () => {
     switch(config.zoomSpeed) {
         case 'slow': return 0.03;
         case 'fast': return 0.15;
         default: return 0.08;
     }
  };

  // Helper to calculate target camera state at a specific time
  const calculateTargetCamera = (currentTime: number) => {
     let targetX = 0.5, targetY = 0.5, targetZoom = config.zoom;
     let eventType = null;

     if (config.autoZoom) {
         const preZoomEvent = zoomEvents.find(e => currentTime >= e.startTime - 0.2 && currentTime < e.startTime);
         const activeEvent = zoomEvents.find(e => currentTime >= e.startTime && currentTime < e.startTime + e.duration);

         if (preZoomEvent) {
              const t = (currentTime - (preZoomEvent.startTime - 0.2)) / 0.2; 
              const easedT = easeOutQuad(t);
              targetZoom = config.zoom + (0.05 * easedT); 
              targetX = 0.5 + (preZoomEvent.x - 0.5) * 0.1 * easedT;
              targetY = 0.5 + (preZoomEvent.y - 0.5) * 0.1 * easedT;
         } else if (activeEvent) {
              eventType = activeEvent.type;
              const transitionDuration = 0.35;
              const timeInEvent = currentTime - activeEvent.startTime;
              
              let eventTargetX = activeEvent.x;
              let eventTargetY = activeEvent.y;

              if (activeEvent.type === 'drag' && activeEvent.xEnd !== undefined && activeEvent.yEnd !== undefined) {
                  const dragProgress = Math.min(1, timeInEvent / activeEvent.duration);
                  eventTargetX = lerp(activeEvent.x, activeEvent.xEnd, dragProgress);
                  eventTargetY = lerp(activeEvent.y, activeEvent.yEnd, dragProgress);
              }

              if (timeInEvent < transitionDuration) {
                  const t = timeInEvent / transitionDuration;
                  const easedT = easeOutBack(t); 
                  const startZoom = config.zoom + 0.05; 
                  targetZoom = startZoom + (activeEvent.scale - startZoom) * easedT;
                  
                  const posEasedT = easeOutQuad(t);
                  targetX = 0.5 + (eventTargetX - 0.5) * posEasedT;
                  targetY = 0.5 + (eventTargetY - 0.5) * posEasedT;
              } else {
                  targetZoom = activeEvent.scale;
                  targetX = eventTargetX;
                  targetY = eventTargetY;
              }
         }
     }

     const halfVisibleW = 0.5 / targetZoom;
     const halfVisibleH = 0.5 / targetZoom;
     targetX = clamp(targetX, halfVisibleW, 1 - halfVisibleW);
     targetY = clamp(targetY, halfVisibleH, 1 - halfVisibleH);
     
     return { x: targetX, y: targetY, zoom: targetZoom, eventType };
  };

  const animate = () => {
    if (videoRef.current) {
        const vid = videoRef.current;
        const currentTime = vid.currentTime;
        
        if (trimRange.end > 0 && currentTime >= trimRange.end) {
            vid.currentTime = trimRange.start;
        }

        const { x, y, zoom, eventType } = calculateTargetCamera(currentTime);
        
        const factor = getLerpFactor();
        currentCamera.current.x = lerp(currentCamera.current.x, x, factor);
        currentCamera.current.y = lerp(currentCamera.current.y, y, factor);
        currentCamera.current.zoom = lerp(currentCamera.current.zoom, zoom, factor);
        
        setCameraState({...currentCamera.current});
        setActiveEventType(eventType);
    }
    
    if (isPlaying) {
       animationFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
      if (!Number.isFinite(e.currentTarget.currentTime) || e.currentTarget.currentTime > 1e6) return;
      
      const currentTime = e.currentTarget.currentTime;
      onTimeUpdate(currentTime);
      
      if (!isPlaying) {
          // When paused (seeking or editing), snap to the calculated camera state for this time
          const { x, y, zoom, eventType } = calculateTargetCamera(currentTime);
          
          setCameraState({ x, y, zoom });
          currentCamera.current = { x, y, zoom };
          setActiveEventType(eventType);
      }
  };

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize' | 'crop_resize' | 'crop_move', targetId?: string, handle?: string) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    
    // Initial values
    let initialX = 0, initialY = 0, initialW = 0, initialH = 0;

    if (type.startsWith('crop')) {
        initialX = cropState.x;
        initialY = cropState.y;
        initialW = cropState.width;
        initialH = cropState.height;
    } else if (targetId) {
        const item = overlays.find(o => o.id === targetId);
        if (item) {
            initialX = item.x;
            initialY = item.y;
            initialW = item.width;
            initialH = item.height;
            onSelectOverlay(targetId);
        }
    }

    setDragState({
        type,
        targetId,
        handle,
        startX: e.clientX,
        startY: e.clientY,
        initialX,
        initialY,
        initialW,
        initialH
    });
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!dragState || !containerRef.current) return;

          const rect = containerRef.current.getBoundingClientRect();
          const zoom = cameraState.zoom;
          const dx = (e.clientX - dragState.startX) / (rect.width / zoom);
          const dy = (e.clientY - dragState.startY) / (rect.height / zoom);
          
          if (dragState.type === 'move' && dragState.targetId) {
              onUpdateOverlay(dragState.targetId, {
                  x: dragState.initialX + dx,
                  y: dragState.initialY + dy
              });
          } else if (dragState.type === 'resize' && dragState.targetId && dragState.handle) {
              let newX = dragState.initialX;
              let newY = dragState.initialY;
              let newW = dragState.initialW;
              let newH = dragState.initialH;

              if (dragState.handle.includes('l')) { newX += dx; newW -= dx; }
              if (dragState.handle.includes('r')) { newW += dx; }
              if (dragState.handle.includes('t')) { newY += dy; newH -= dy; }
              if (dragState.handle.includes('b')) { newH += dy; }
              
              if (newW < 0.05) newW = 0.05;
              if (newH < 0.05) newH = 0.05;

              onUpdateOverlay(dragState.targetId, { x: newX, y: newY, width: newW, height: newH });
          } else if (dragState.type === 'crop_resize' && dragState.handle) {
              let newX = dragState.initialX;
              let newY = dragState.initialY;
              let newW = dragState.initialW;
              let newH = dragState.initialH;
              
              if (dragState.handle.includes('l')) { newX += dx; newW -= dx; }
              if (dragState.handle.includes('r')) { newW += dx; }
              if (dragState.handle.includes('t')) { newY += dy; newH -= dy; }
              if (dragState.handle.includes('b')) { newH += dy; }
              
              newX = Math.max(0, newX);
              newY = Math.max(0, newY);
              
              onUpdateCrop({ ...cropState, x: newX, y: newY, width: newW, height: newH });
          } else if (dragState.type === 'crop_move') {
              const newX = dragState.initialX + dx;
              const newY = dragState.initialY + dy;
              // Constrain to container
              const maxX = 1 - dragState.initialW;
              const maxY = 1 - dragState.initialH;
              
              onUpdateCrop({ 
                  ...cropState, 
                  x: Math.max(0, Math.min(maxX, newX)), 
                  y: Math.max(0, Math.min(maxY, newY)) 
              });
          }
      };

      const handleMouseUp = () => {
          setDragState(null);
      };

      if (dragState) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }

      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [dragState, onUpdateOverlay, onUpdateCrop, cameraState.zoom, cropState]);


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
  
  const clipPathValue = cropState.active 
    ? `inset(${cropState.y * 100}% ${(1 - (cropState.x + cropState.width)) * 100}% ${(1 - (cropState.y + cropState.height)) * 100}% ${cropState.x * 100}%)`
    : 'none';

  const EventIcon = () => {
    switch (activeEventType) {
      case 'click':
      case 'double_click':
        return <MousePointerClick size={16} className="text-white" />;
      case 'focus':
        return <TextCursor size={16} className="text-white" />;
      case 'drag':
        return <Hand size={16} className="text-white" />;
      case 'selection':
        return <Scan size={16} className="text-white" />;
      default:
        return <Scan size={16} className="text-white" />;
    }
  };

  return (
    <div className="flex-1 bg-[#121212] overflow-hidden flex items-center justify-center relative" 
        onClick={(e) => {
           if (e.target === e.currentTarget) onSelectOverlay(null);
        }}
    >
       <div className="absolute inset-0 opacity-[0.05]" 
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
       </div>

       <div 
         className="relative transition-all duration-500 ease-in-out shadow-2xl"
         style={{
            ...getAspectRatioStyle(),
            background: config.background,
            padding: `${config.padding}px`,
         }}
       >
          <div className="relative w-full h-full">
             
             {/* 1. CLIPPED CONTENT LAYER (Video + Visuals) */}
             <div 
                className="absolute inset-0 overflow-hidden" 
                style={{
                   borderRadius: `${config.roundness}px`,
                   boxShadow: `0 ${config.shadow}px ${config.shadow * 2}px rgba(0,0,0,${config.shadow > 0 ? 0.3 : 0})`,
                }}
             >
                <div 
                   ref={containerRef}
                   className="w-full h-full will-change-transform bg-black origin-top-left relative"
                   style={{
                     transform: `translate(${translateX}%, ${translateY}%) scale(${cameraState.zoom})`,
                     transition: 'none' 
                   }}
                 >
                   <video
                     ref={videoRef}
                     src={videoUrl}
                     className="block w-full h-full object-contain pointer-events-none"
                     style={{ clipPath: clipPathValue, transition: 'clip-path 0.3s' }}
                     onTimeUpdate={handleTimeUpdate}
                     onLoadedMetadata={(e) => {
                         const video = e.currentTarget;
                         const d = video.duration;
                         if (d === Infinity) {
                            // Fix for Chrome MediaRecorder Blob duration bug
                            video.currentTime = 1e101;
                            const fixDuration = () => {
                                 video.currentTime = 0;
                                 if (Number.isFinite(video.duration)) {
                                     onDurationChange(video.duration);
                                 }
                            };
                            video.addEventListener('timeupdate', fixDuration, { once: true });
                         } else if (Number.isFinite(d)) {
                             onDurationChange(d);
                         }
                     }}
                     playsInline
                     muted={false} 
                   />
                   
                   {/* Visuals only - clipped by border radius */}
                   {overlays.map(item => {
                       const isActive = activeOverlayId === item.id;
                       const videoTime = videoRef.current?.currentTime || 0;
                       const isVisible = videoTime >= item.startTime && videoTime < item.startTime + item.duration;
                       if (!isVisible && !isActive) return null;
                       
                       return (
                           <div
                               key={item.id}
                               className="absolute pointer-events-none"
                               style={{
                                   left: `${item.x * 100}%`,
                                   top: `${item.y * 100}%`,
                                   width: `${item.width * 100}%`,
                                   height: `${item.height * 100}%`,
                               }}
                           >
                               {item.type === 'blur' && (
                                   <div className="w-full h-full backdrop-blur-md bg-white/10 rounded-lg" />
                               )}
                               
                               {item.type === 'spotlight' && (
                                   <div className="w-full h-full rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]" />
                               )}
                           </div>
                       );
                   })}
                   
                   {config.autoZoom && activeEventType && (
                       <div className="absolute top-4 right-4 z-20 animate-fade-in opacity-80 scale-[1]">
                           <div className="bg-black/50 backdrop-blur-sm p-2 rounded-full border border-white/10">
                               <EventIcon />
                           </div>
                       </div>
                   )}
                 </div>
             </div>

             {/* 2. UNCLIPPED INTERACTIVE LAYER (Handles & Selection) */}
             <div className="absolute inset-0 pointer-events-none" style={{ borderRadius: `${config.roundness}px` }}>
                 <div 
                     className="w-full h-full will-change-transform origin-top-left"
                     style={{
                        transform: `translate(${translateX}%, ${translateY}%) scale(${cameraState.zoom})`,
                     }}
                 >
                     {/* Overlay Controls */}
                     {overlays.map(item => {
                         const isActive = activeOverlayId === item.id;
                         const videoTime = videoRef.current?.currentTime || 0;
                         const isVisible = videoTime >= item.startTime && videoTime < item.startTime + item.duration;
                         
                         if (!isVisible && !isActive) return null;

                         // Inverse scale handles so they stay constant size on screen
                         const handleScale = 1 / cameraState.zoom;

                         return (
                             <div
                                 key={item.id}
                                 className={`absolute ${isActive ? 'z-50' : 'z-10'}`}
                                 style={{
                                     left: `${item.x * 100}%`,
                                     top: `${item.y * 100}%`,
                                     width: `${item.width * 100}%`,
                                     height: `${item.height * 100}%`,
                                 }}
                             >
                                 <div 
                                    className={`absolute inset-0 cursor-move pointer-events-auto ${isActive ? 'border-2 border-blue-500' : 'hover:border-2 hover:border-blue-500/50 border-transparent'}`}
                                    onMouseDown={(e) => handleMouseDown(e, 'move', item.id)}
                                    onClick={(e) => { e.stopPropagation(); onSelectOverlay(item.id); }}
                                 />
                                 
                                 {isActive && ['tl', 'tr', 'bl', 'br'].map(pos => (
                                     <div
                                        key={pos}
                                        onMouseDown={(e) => handleMouseDown(e, 'resize', item.id, pos)}
                                        className={`absolute w-4 h-4 bg-white border border-blue-500 rounded-full z-50 pointer-events-auto cursor-${pos === 'tl' || pos === 'br' ? 'nwse' : 'nesw'}-resize shadow-sm flex items-center justify-center`}
                                        style={{
                                            top: pos.includes('t') ? '-8px' : 'auto',
                                            bottom: pos.includes('b') ? '-8px' : 'auto',
                                            left: pos.includes('l') ? '-8px' : 'auto',
                                            right: pos.includes('r') ? '-8px' : 'auto',
                                            transform: `scale(${handleScale})`, // Keep handle visual size constant
                                            transformOrigin: 'center center'
                                        }}
                                     >
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                     </div>
                                 ))}
                             </div>
                         );
                     })}

                     {/* Crop Controls */}
                     {cropState.active && (
                         <div className="absolute z-[100] inset-0">
                             {/* Crop Area Outline and Handles */}
                             <div 
                                 className="absolute"
                                 style={{
                                     left: `${cropState.x * 100}%`,
                                     top: `${cropState.y * 100}%`,
                                     width: `${cropState.width * 100}%`,
                                     height: `${cropState.height * 100}%`,
                                 }}
                             >
                                 {/* Dimming Outline */}
                                 <div className="absolute inset-0 outline outline-[9999px] outline-black/50 pointer-events-none" />
                                 
                                 <div 
                                    className="absolute inset-0 cursor-move pointer-events-auto border-2 border-amber-500"
                                    onMouseDown={(e) => handleMouseDown(e, 'crop_move')}
                                 />

                                 {['tl', 'tr', 'bl', 'br'].map(pos => {
                                     const handleScale = 1 / cameraState.zoom;
                                     return (
                                     <div
                                        key={pos}
                                        onMouseDown={(e) => handleMouseDown(e, 'crop_resize', undefined, pos)}
                                        className={`absolute w-5 h-5 bg-amber-500 border-2 border-white z-50 pointer-events-auto cursor-${pos === 'tl' || pos === 'br' ? 'nwse' : 'nesw'}-resize shadow-lg flex items-center justify-center`}
                                        style={{
                                            top: pos.includes('t') ? '-10px' : 'auto',
                                            bottom: pos.includes('b') ? '-10px' : 'auto',
                                            left: pos.includes('l') ? '-10px' : 'auto',
                                            right: pos.includes('r') ? '-10px' : 'auto',
                                            transform: `scale(${handleScale})`, // Keep handle visual size constant
                                            transformOrigin: 'center center'
                                        }}
                                     >
                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                     </div>
                                 )})}
                             </div>
                         </div>
                     )}
                 </div>
             </div>

          </div>
       </div>
    </div>
  );
};