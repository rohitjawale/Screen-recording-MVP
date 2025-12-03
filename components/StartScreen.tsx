import React, { useState } from 'react';
import { Monitor, Mic, ArrowRight, Info } from 'lucide-react';

interface StartScreenProps {
  onStartRecording: (withAudio: boolean) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartRecording }) => {
  const [withAudio, setWithAudio] = useState(false);

  return (
    <div className="flex items-center justify-center h-screen w-full bg-[#F5F7FA]">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-100 relative overflow-hidden">
        {/* Decorative background element */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <Monitor size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Web Screen Recorder</h1>
            <p className="text-gray-500 text-sm">Capture high-quality video from any tab</p>
          </div>

          <div className="space-y-4">
            
            {/* Audio Toggle */}
            <div 
              onClick={() => setWithAudio(!withAudio)}
              className={`flex items-center justify-between px-4 py-4 rounded-xl border cursor-pointer transition-all ${
                withAudio ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg transition-colors ${withAudio ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Mic size={20} />
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-sm font-semibold ${withAudio ? 'text-blue-700' : 'text-gray-700'}`}>
                    Microphone Audio
                  </span>
                  <span className="text-xs text-gray-400">Record voiceover while capturing</span>
                </div>
              </div>
              
               {/* Toggle Switch */}
               <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${withAudio ? 'bg-blue-500' : 'bg-gray-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${withAudio ? 'translate-x-5' : 'translate-x-0'}`} />
               </div>
            </div>

            {/* Info Box */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex gap-3 items-start text-left">
               <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
               <p className="text-xs text-gray-500 leading-relaxed">
                 For security reasons, browsers manage tab selection. Click <strong>Start Recording</strong>, then select your desired tab or window in the pop-up dialog.
               </p>
            </div>

            <button
              onClick={() => onStartRecording(withAudio)}
              className="w-full bg-[#4C6EF5] hover:bg-[#3b5bdb] text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 group"
            >
              Start Recording
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};