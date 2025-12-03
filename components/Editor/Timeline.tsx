import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, MousePointer2, ZoomIn, Zap } from 'lucide-react';

interface TimelineProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ 
  isPlaying, 
  onTogglePlay, 
  currentTime, 
  duration, 
  onSeek 
}) => {
  
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Mock markers for zoom events
  const zoomMarkers = [15, 45, 70]; // Percentages
  const clickMarkers = [10, 32, 55, 88]; // Percentages

  return (
    <div className="h-[220px] bg-[#1E1E1E] border-t border-white/5 flex flex-col z-20">
      
      {/* Toolbar */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-6 bg-[#252525]">
        <div className="flex items-center gap-4">
           <button className="text-gray-400 hover:text-white transition-colors p-1.5 hover:bg-white/5 rounded-md" title="Cut">
             <Scissors size={18} />
           </button>
           <div className="h-4 w-[1px] bg-white/10 mx-2" />
           <button className="text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 border border-blue-500/20 hover:bg-blue-500/20 transition-colors">
             <ZoomIn size={14} />
             Add Auto Zoom
           </button>
           <button className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-white/5 rounded-lg">
             <MousePointer2 size={14} />
             Cursor Effects
           </button>
        </div>
        
        <div className="flex items-center gap-1 text-xs font-mono text-gray-500">
          <span className="text-white">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Timeline Area */}
      <div className="flex-1 px-6 py-4 relative overflow-hidden">
         {/* Playhead Controls */}
         <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
            <button className="text-gray-500 hover:text-white transition-colors" onClick={() => onSeek(Math.max(0, currentTime - 5))}>
              <SkipBack size={18} />
            </button>
            <button 
              onClick={onTogglePlay}
              className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-white/10"
            >
              {isPlaying ? <Pause size={14} fill="black" /> : <Play size={14} fill="black" className="ml-0.5" />}
            </button>
            <button className="text-gray-500 hover:text-white transition-colors" onClick={() => onSeek(Math.min(duration, currentTime + 5))}>
              <SkipForward size={18} />
            </button>
         </div>

         {/* Tracks Container */}
         <div className="mt-8 flex flex-col gap-1 cursor-pointer"
              onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const newTime = (x / rect.width) * duration;
               onSeek(newTime);
             }}>
             
             {/* 1. Video Track */}
             <div className="relative h-14 bg-[#111] rounded-t-lg border border-white/5 overflow-hidden group">
                {/* Mock Waveform / Visuals */}
                <div className="absolute inset-0 flex items-center justify-center opacity-20">
                   <div className="flex gap-[2px] items-center h-full w-full px-2">
                     {Array.from({ length: 120 }).map((_, i) => (
                       <div 
                         key={i} 
                         className="w-1 bg-blue-500 rounded-full" 
                         style={{ height: `${20 + Math.random() * 60}%` }} 
                       />
                     ))}
                   </div>
                </div>
                
                <div className="absolute inset-0 flex p-2">
                    <div className="bg-blue-600/10 w-full h-full border border-blue-500/20 rounded flex items-center px-3">
                       <span className="text-[10px] text-blue-400 font-medium tracking-wide">Screen Recording 001</span>
                    </div>
                </div>
             </div>

             {/* 2. Zoom & Events Track */}
             <div className="relative h-8 bg-[#151515] rounded-b-lg border-x border-b border-white/5 overflow-hidden">
                <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-[9px] text-gray-600 font-semibold uppercase tracking-wider mr-4 w-12 shrink-0">Events</span>
                    
                    {/* Mock Zoom Regions */}
                    {zoomMarkers.map((pos, i) => (
                        <div 
                          key={`zoom-${i}`} 
                          className="absolute h-5 bg-purple-500/20 border border-purple-500/40 rounded flex items-center justify-center"
                          style={{ left: `${pos}%`, width: '10%' }}
                        >
                            <ZoomIn size={10} className="text-purple-400" />
                        </div>
                    ))}

                    {/* Mock Click Events */}
                    {clickMarkers.map((pos, i) => (
                        <div 
                            key={`click-${i}`}
                            className="absolute h-3 w-3 rounded-full bg-yellow-500/80 border border-yellow-300 shadow-sm"
                            style={{ left: `${pos}%`, top: '50%', transform: 'translateY(-50%)' }}
                            title="Mouse Click"
                        />
                    ))}
                </div>
             </div>
         </div>

         {/* Progress Bar overlay */}
         <div className="absolute top-[52px] left-6 right-6 bottom-0 pointer-events-none">
            <div 
               className="absolute top-0 bottom-6 left-0 bg-white/5 transition-all duration-75"
               style={{ width: `${progress}%` }}
            />
            {/* Playhead Line */}
            <div 
               className="absolute top-0 h-[100px] w-[1px] bg-red-500 z-30 transition-all duration-75 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
               style={{ left: `${progress}%` }}
            >
              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-500 -translate-x-[4.5px]" />
            </div>
         </div>

      </div>
    </div>
  );
};