import React from 'react';
import { Loader2 } from 'lucide-react';

export const ProcessingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-full bg-[#1E1E1E] text-white">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        <Loader2 size={64} className="text-blue-500 animate-spin relative z-10" />
      </div>
      <h2 className="text-2xl font-semibold mb-2 tracking-tight">Processing your recording...</h2>
      <p className="text-gray-400 text-sm">Preparing your high-quality workspace</p>
    </div>
  );
};