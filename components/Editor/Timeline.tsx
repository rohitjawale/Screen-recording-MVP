import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Scissors, MousePointer2 } from 'lucide-react';

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

  return (
    <div className="h-[180px] bg-[#1E1E1E] border-t border-white/5 flex flex-col z-20">
      
      {/* Toolbar */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
           <button className="text-gray-400 hover:text-white transition-colors" title="Cut">
             <Scissors size={18} />
           </button>
           <button className="text-blue-400 bg-blue-500/10 px-3 py-1 rounded text-xs font-medium flex items-center gap-2 border border-blue-500/20">
             <MousePointer2 size={12} />
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
      <div className="flex-1 p-6 relative">
         {/* Playhead Controls */}
         <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10">
            <button className="text-gray-400 hover:text-white transition-colors" onClick={() => onSeek(Math.max(0, currentTime - 5))}>
              <SkipBack size={20} />
            </button>
            <button 
              onClick={onTogglePlay}
              className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={18} fill="black" /> : <Play size={18} fill="black" className="ml-1" />}
            </button>
            <button className="text-gray-400 hover:text-white transition-colors" onClick={() => onSeek(Math.min(duration, currentTime + 5))}>
              <SkipForward size={20} />
            </button>
         </div>

         {/* Track */}
         <div className="mt-10 relative h-16 bg-[#111] rounded-lg border border-white/5 overflow-hidden group cursor-pointer"
             onClick={(e) => {
               const rect = e.currentTarget.getBoundingClientRect();
               const x = e.clientX - rect.left;
               const newTime = (x / rect.width) * duration;
               onSeek(newTime);
             }}
         >
            {/* Mock Waveform */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
               <div className="flex gap-[2px] items-center h-full w-full px-2">
                 {Array.from({ length: 100 }).map((_, i) => (
                   <div 
                     key={i} 
                     className="w-1 bg-blue-500 rounded-full" 
                     style={{ height: `${20 + Math.random() * 60}%` }} 
                   />
                 ))}
               </div>
            </div>

            {/* Video Strip Mock */}
            <div className="absolute inset-0 flex">
                <div className="bg-blue-600/20 w-full h-full border border-blue-500/30 rounded-lg flex items-center justify-center">
                   <span className="text-xs text-blue-400 font-medium">Screen Recording 001</span>
                </div>
            </div>

            {/* Progress Bar overlay */}
            <div 
               className="absolute top-0 bottom-0 left-0 bg-white/5 pointer-events-none"
               style={{ width: `${progress}%` }}
            />
            
            {/* Playhead Line */}
            <div 
               className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none transition-all duration-75"
               style={{ left: `${progress}%` }}
            >
              <div className="w-3 h-3 bg-red-500 rounded-full -translate-x-[5px] -translate-y-[4px]" />
            </div>
         </div>
      </div>
    </div>
  );
};