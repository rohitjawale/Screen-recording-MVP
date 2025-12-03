import React from 'react';
import { EditorConfig, BACKGROUND_PRESETS } from '../../types';
import { Sliders, Maximize, Circle, BoxSelect, Download, Sparkles, MousePointer2 } from 'lucide-react';

interface SidebarProps {
  config: EditorConfig;
  onChange: (newConfig: EditorConfig) => void;
  onExport: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ config, onChange, onExport }) => {
  
  const handleChange = (key: keyof EditorConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const SliderControl = ({ label, icon: Icon, value, min, max, settingKey }: any) => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider font-semibold">
          <Icon size={12} />
          {label}
        </div>
        <span className="text-xs text-gray-500 font-mono">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => handleChange(settingKey, parseInt(e.target.value))}
        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="w-[320px] bg-[#1E1E1E] border-r border-white/5 h-full flex flex-col shadow-2xl z-20">
      <div className="p-4 border-b border-white/5 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
           <Sliders size={16} className="text-white" />
        </div>
        <h2 className="text-white font-medium">Edit Project</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        
        {/* Magic / Auto Actions */}
        <div className="mb-8 p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl">
           <div className="flex items-center gap-2 mb-3 text-blue-400 text-xs font-bold uppercase tracking-wider">
             <Sparkles size={12} />
             Magic Effects
           </div>
           
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <MousePointer2 size={14} className="text-gray-300" />
                 <span className="text-sm text-gray-200">Auto Zoom</span>
              </div>
              
              <button 
                onClick={() => handleChange('autoZoom', !config.autoZoom)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${config.autoZoom ? 'bg-blue-500' : 'bg-gray-700'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all duration-300 ${config.autoZoom ? 'left-6' : 'left-1'}`} />
              </button>
           </div>
           <p className="text-[10px] text-gray-500 mt-2 leading-tight">
             Simulate camera movement following cursor actions.
           </p>
        </div>

        {/* Aspect Ratio */}
        <div className="mb-8">
          <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Canvas Size</label>
          <div className="grid grid-cols-3 gap-2">
            {['Original', '16:9', '1:1', '4:3', '9:16'].map((ratio) => (
              <button
                key={ratio}
                onClick={() => handleChange('aspectRatio', ratio === 'Original' ? 'original' : ratio)}
                className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                  (config.aspectRatio === ratio.toLowerCase() || (ratio === 'Original' && config.aspectRatio === 'original'))
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-2">
            <SliderControl 
              label="Padding" 
              icon={Maximize} 
              value={config.padding} 
              min={0} max={200} 
              settingKey="padding" 
            />
            <SliderControl 
              label="Roundness" 
              icon={Circle} 
              value={config.roundness} 
              min={0} max={40} 
              settingKey="roundness" 
            />
             <SliderControl 
              label="Shadow" 
              icon={BoxSelect} 
              value={config.shadow} 
              min={0} max={100} 
              settingKey="shadow" 
            />
        </div>

        {/* Backgrounds */}
        <div className="mt-8">
          <label className="block text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Background</label>
          <div className="grid grid-cols-4 gap-3">
            {BACKGROUND_PRESETS.map((bg, idx) => (
              <button
                key={idx}
                onClick={() => handleChange('background', bg)}
                className={`w-12 h-12 rounded-xl transition-transform hover:scale-105 border-2 ${
                  config.background === bg ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: bg }}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Export Action */}
      <div className="p-4 border-t border-white/5">
         <button 
           onClick={onExport}
           className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
         >
           <Download size={18} />
           Export Video
         </button>
      </div>
    </div>
  );
};