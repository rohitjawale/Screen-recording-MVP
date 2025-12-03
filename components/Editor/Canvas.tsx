import React, { useRef, useEffect } from 'react';
import { EditorConfig } from '../../types';

interface CanvasProps {
  config: EditorConfig;
  videoUrl: string;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const Canvas: React.FC<CanvasProps> = ({ 
  config, 
  videoUrl, 
  isPlaying, 
  onTimeUpdate,
  onDurationChange,
  videoRef
}) => {
  
  // Handle Play/Pause side effects from parent state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(e => console.error("Play failed", e));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const getAspectRatioStyle = () => {
    switch (config.aspectRatio) {
      case '16:9': return { aspectRatio: '16/9', width: '100%', maxWidth: '800px' };
      case '1:1': return { aspectRatio: '1/1', height: '100%', maxHeight: '600px' };
      case '4:3': return { aspectRatio: '4/3', width: '100%', maxWidth: '700px' };
      case '9:16': return { aspectRatio: '9/16', height: '100%', maxHeight: '700px' };
      default: return { width: 'auto', height: 'auto', maxWidth: '90%' }; // Original
    }
  };

  return (
    <div className="flex-1 bg-[#121212] overflow-hidden flex items-center justify-center relative">
       {/* Dot Grid Background for Editor Area */}
       <div className="absolute inset-0 opacity-[0.05]" 
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
       </div>

       {/* The "Exportable" Area Container */}
       <div 
         id="export-canvas"
         className="relative flex items-center justify-center transition-all duration-300 ease-in-out shadow-2xl overflow-hidden"
         style={{
            ...getAspectRatioStyle(),
            background: config.background,
            padding: `${config.padding}px`,
         }}
       >
          {/* Video Container with User Styles */}
          <div 
             className="relative overflow-hidden transition-all duration-300"
             style={{
               borderRadius: `${config.roundness}px`,
               boxShadow: `0 ${config.shadow}px ${config.shadow * 2}px rgba(0,0,0,${config.shadow > 0 ? 0.3 : 0})`,
             }}
          >
             <video
               ref={videoRef}
               src={videoUrl}
               className="block max-w-full max-h-full object-contain bg-black"
               onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
               onLoadedMetadata={(e) => onDurationChange(e.currentTarget.duration)}
               playsInline
               loop
             />
          </div>

          {/* Optional: Watermark or Decor */}
          <div className="absolute bottom-6 right-6 opacity-30 pointer-events-none mix-blend-overlay">
             <span className="text-white font-bold text-lg tracking-widest">REC</span>
          </div>
       </div>
    </div>
  );
};