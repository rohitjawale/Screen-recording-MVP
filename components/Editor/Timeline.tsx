import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, MousePointer2, ZoomIn, Hand, MousePointerClick, TextCursor, Scan, Film, Droplets, Focus, Crop as CropIcon } from 'lucide-react';
import { ZoomEvent, ZoomEventType, OverlayItem, OverlayType, CropState } from '../../types';

interface TimelineProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  zoomEvents: ZoomEvent[];
  trimRange: { start: number; end: number };
  onTrimChange: (range: { start: number; end: number }) => void;
  onAddOverlay: (type: OverlayType) => void;
  overlays: OverlayItem[];
  onUpdateOverlay: (id: string, updates: Partial<OverlayItem>) => void;
  activeOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
  cropState: CropState;
  onToggleCrop: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  isPlaying, 
  onTogglePlay, 
  currentTime, 
  duration, 
  onSeek,
  zoomEvents,
  trimRange,
  onTrimChange,
  onAddOverlay,
  overlays,
  onUpdateOverlay,
  activeOverlayId,
  onSelectOverlay,
  cropState,
  onToggleCrop
}) => {
  
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDraggingHandle, setIsDraggingHandle] = useState<'start' | 'end' | null>(null);

  // Handle Drag Logic for Trimming
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingHandle || !trackRef.current || duration === 0) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const time = percentage * duration;
      
      if (isDraggingHandle === 'start') {
          // Clamp start: 0 <= start <= end - 0.5
          const newStart = Math.min(Math.max(0, time), trimRange.end - 0.5);
          onTrimChange({ ...trimRange, start: newStart });
      } else {
          // Clamp end: start + 0.5 <= end <= duration
          const newEnd = Math.max(Math.min(duration, time), trimRange.start + 0.5);
          onTrimChange({ ...trimRange, end: newEnd });
      }
    };
    
    const handleMouseUp = () => {
      setIsDraggingHandle(null);
    };
    
    if (isDraggingHandle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingHandle, duration, trimRange, onTrimChange]);

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  
  // Trim visualization percentages
  const trimStartPct = duration > 0 ? (trimRange.start / duration) * 100 : 0;
  const trimEndPct = duration > 0 ? (trimRange.end / duration) * 100 : 100;

  const getEventStyle = (type: ZoomEventType) => {
    switch (type) {
      case 'click':
      case 'double_click':
        return { 
          icon: MousePointerClick, 
          gradient: 'from-amber-500/80 to-orange-500/80', 
          border: 'border-orange-500/30' 
        };
      case 'focus':
        return { 
          icon: TextCursor, 
          gradient: 'from-blue-500/80 to-cyan-500/80', 
          border: 'border-cyan-500/30' 
        };
      case 'drag':
        return { 
          icon: Hand, 
          gradient: 'from-purple-500/80 to-pink-500/80', 
          border: 'border-pink-500/30' 
        };
      case 'selection':
        return { 
          icon: Scan, 
          gradient: 'from-emerald-500/80 to-green-500/80', 
          border: 'border-green-500/30' 
        };
      default:
        return { 
          icon: ZoomIn, 
          gradient: 'from-gray-600/80 to-gray-500/80', 
          border: 'border-white/20' 
        };
    }
  };

  return (
    <div className="h-[280px] bg-[#1E1E1E] border-t border-white/5 flex flex-col z-20 select-none">
      
      {/* Toolbar */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-[#252525]">
        <div className="flex items-center gap-4">
           {/* CUT */}
           <button className="text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-md transition-colors" title="Cut Clip">
             <Scissors size={18} />
           </button>
           
           <div className="h-4 w-[1px] bg-white/10 mx-1" />
           
           {/* AUTO ZOOM */}
           <button className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
             <ZoomIn size={14} />
             Add Auto Zoom
           </button>
           
           {/* CURSOR EFFECTS */}
           <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-white/5 rounded-lg">
             <MousePointer2 size={14} />
             Cursor Effects
           </button>

           <div className="h-4 w-[1px] bg-white/10 mx-1" />

           {/* NEW: BLUR */}
           <button 
              onClick={() => onAddOverlay('blur')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-white/5 rounded-lg"
              title="Add Blur Overlay"
           >
             <Droplets size={14} />
             Blur
           </button>

           {/* NEW: SPOTLIGHT */}
           <button 
              onClick={() => onAddOverlay('spotlight')}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-white/5 rounded-lg"
              title="Add Spotlight"
           >
             <Focus size={14} />
             Spotlight
           </button>

           {/* NEW: CROP */}
           <button 
              onClick={onToggleCrop}
              className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors ${cropState.active ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              title="Toggle Crop Mode"
           >
             <CropIcon size={14} />
             Crop
           </button>

        </div>
        
        <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
          <span className="text-white">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(Math.max(0, trimRange.end - trimRange.start))}</span>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex-1 px-6 py-4 relative group/timeline">
         {/* Playhead Controls */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
            <button className="text-gray-500 hover:text-white transition-colors" onClick={() => onSeek(Math.max(trimRange.start, currentTime - 5))}>
              <SkipBack size={18} />
            </button>
            <button 
              onClick={onTogglePlay}
              className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
            </button>
            <button className="text-gray-500 hover:text-white transition-colors" onClick={() => onSeek(Math.min(trimRange.end, currentTime + 5))}>
              <SkipForward size={18} />
            </button>
         </div>

         {/* Tracks Container */}
         <div className="mt-8 flex flex-col gap-2 cursor-pointer"
              ref={trackRef}
              onClick={(e) => {
               // Ignore click if dragging handle
               if (isDraggingHandle) return;
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const newTime = (x / rect.width) * duration;
               // Allow seeking anywhere, but playback will clamp
               onSeek(newTime);
             }}>
             
             {/* 1. Clip Track */}
             <div className="relative h-14">
                <div className="absolute inset-0 rounded-lg overflow-hidden bg-[#1A1A1A]">
                    <div 
                       className="absolute top-0 bottom-0 bg-[#2A2A2A] border-y border-white/5 overflow-hidden transition-colors duration-300"
                       style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }}
                    >
                         <div className="absolute inset-0 bg-amber-500/10 group-hover:bg-amber-500/20"></div>
                         <div className="absolute inset-0 flex items-center px-4 gap-3 text-amber-500/90 whitespace-nowrap overflow-hidden">
                            <Film size={16} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-semibold tracking-wide">Clip</span>
                         </div>
                    </div>
                    {/* Dimmed Areas */}
                    <div className="absolute top-0 bottom-0 left-0 bg-black/70 pointer-events-none border-r border-white/10" style={{ width: `${trimStartPct}%` }} />
                    <div className="absolute top-0 bottom-0 right-0 bg-black/70 pointer-events-none border-l border-white/10" style={{ width: `${100 - trimEndPct}%` }} />
                </div>

                {/* TRIM HANDLES */}
                <div 
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize z-40 group/handle flex flex-col items-end justify-center hover:scale-105 transition-transform"
                  style={{ left: `${trimStartPct}%`, transform: 'translateX(-100%)' }}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingHandle('start'); }}
                >
                   <div className="h-full w-4 bg-amber-500 rounded-l-md border-l border-y border-amber-400 shadow-lg flex items-center justify-center relative">
                      <div className="w-[2px] h-6 bg-black/30 rounded-full" />
                   </div>
                   <div className="absolute -top-10 right-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/handle:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                      {formatTime(trimRange.start)}
                      <div className="absolute -bottom-1 right-2 w-2 h-2 bg-amber-500 rotate-45"></div>
                   </div>
                </div>

                <div 
                  className="absolute top-0 bottom-0 w-6 cursor-ew-resize z-40 group/handle flex flex-col items-start justify-center hover:scale-105 transition-transform"
                  style={{ left: `${trimEndPct}%` }}
                  onMouseDown={(e) => { e.stopPropagation(); setIsDraggingHandle('end'); }}
                >
                   <div className="h-full w-4 bg-amber-500 rounded-r-md border-r border-y border-amber-400 shadow-lg flex items-center justify-center relative">
                       <div className="w-[2px] h-6 bg-black/30 rounded-full" />
                   </div>
                   <div className="absolute -top-10 left-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover/handle:opacity-100 transition-opacity whitespace-nowrap shadow-lg">
                      {formatTime(trimRange.end)}
                      <div className="absolute -bottom-1 left-2 w-2 h-2 bg-amber-500 rotate-45"></div>
                   </div>
                </div>
             </div>

             {/* 2. Events Track (Zoom) */}
             <div className="relative h-8 bg-[#121212] border border-white/5 rounded-md overflow-hidden flex items-center">
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pr-4 bg-[#1E1E1E] border-r border-white/5 z-10">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider w-12">Zooms</span>
                </div>
                <div className="absolute inset-0 left-[70px]"> {/* Offset for label */}
                    {zoomEvents.map((evt) => {
                      const startPct = duration > 0 ? (evt.startTime / duration) * 100 : 0;
                      const widthPct = duration > 0 ? (evt.duration / duration) * 100 : 0;
                      const { icon: Icon, gradient, border } = getEventStyle(evt.type);
                      const isOutside = evt.startTime < trimRange.start || (evt.startTime + evt.duration) > trimRange.end;
                      
                      return (
                        <div 
                          key={evt.id} 
                          className={`absolute top-1 bottom-1 bg-gradient-to-r ${gradient} border ${border} rounded-sm flex items-center justify-center shadow-sm hover:brightness-110 group transition-all ${isOutside ? 'opacity-20 saturate-0' : 'opacity-100'}`}
                          style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 1)}%` }} // Ensure min width
                        >
                            <Icon size={12} className="text-white drop-shadow-md" />
                        </div>
                      );
                    })}
                </div>
             </div>

             {/* 3. Effects Track (Blur/Spotlight) */}
             <div className="relative h-8 bg-[#121212] border border-white/5 rounded-md overflow-hidden flex items-center">
                 <div className="absolute inset-y-0 left-0 flex items-center pl-2 pr-4 bg-[#1E1E1E] border-r border-white/5 z-10">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider w-12">Effects</span>
                </div>
                <div className="absolute inset-0 left-[70px]"> {/* Offset for label */}
                    {overlays.map((evt) => {
                      const startPct = duration > 0 ? (evt.startTime / duration) * 100 : 0;
                      const widthPct = duration > 0 ? (evt.duration / duration) * 100 : 0;
                      const isOutside = evt.startTime < trimRange.start || (evt.startTime + evt.duration) > trimRange.end;
                      const isSelected = activeOverlayId === evt.id;

                      return (
                        <div 
                          key={evt.id} 
                          onClick={(e) => { e.stopPropagation(); onSelectOverlay(evt.id); }}
                          className={`absolute top-1 bottom-1 rounded-sm flex items-center justify-center shadow-sm hover:brightness-110 group transition-all cursor-pointer border ${isSelected ? 'border-white ring-1 ring-white' : 'border-transparent'} ${isOutside ? 'opacity-20 saturate-0' : 'opacity-100'} ${evt.type === 'blur' ? 'bg-indigo-600/60' : 'bg-amber-600/60'}`}
                          style={{ left: `${startPct}%`, width: `${Math.max(widthPct, 1)}%` }} // Ensure min width
                        >
                            {evt.type === 'blur' ? <Droplets size={12} className="text-indigo-100 drop-shadow-md" /> : <Focus size={12} className="text-amber-100 drop-shadow-md" />}
                        </div>
                      );
                    })}
                </div>
             </div>
         </div>

         {/* Playhead */}
         <div className="absolute top-[52px] left-6 right-6 bottom-0 pointer-events-none overflow-hidden">
            <div 
               className="absolute top-0 h-full w-[1px] bg-red-500 z-30 transition-all duration-75 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
               style={{ left: `${progress}%` }}
            >
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-500 -translate-x-[4.5px]" />
            </div>
         </div>

      </div>
    </div>
  );
};