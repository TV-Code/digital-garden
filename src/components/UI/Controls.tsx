import React, { useState } from 'react';
import { Leaf, Sun, Droplet, Wind } from 'lucide-react';

interface ControlsProps {
  onInteractionTypeChange: (type: 'growth' | 'energy' | 'flow') => void;
  onSettingsChange: (settings: any) => void;
  environmentalFactors: number[];
}

const Controls: React.FC<ControlsProps> = ({
  onInteractionTypeChange,
  onSettingsChange,
  environmentalFactors
}) => {
  const [activeType, setActiveType] = useState<'growth' | 'energy' | 'flow'>('growth');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleTypeChange = (type: 'growth' | 'energy' | 'flow') => {
    setActiveType(type);
    onInteractionTypeChange(type);
  };

  return (
    <div className="fixed bottom-6 left-6 flex flex-col gap-4">
      {/* Main controls */}
      <div className="flex gap-2">
        <button
          className={`p-3 rounded-full backdrop-blur-lg transition-all
            ${activeType === 'growth' 
              ? 'bg-green-500/20 text-green-300' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          onClick={() => handleTypeChange('growth')}
        >
          <Leaf className="w-6 h-6" />
        </button>

        <button
          className={`p-3 rounded-full backdrop-blur-lg transition-all
            ${activeType === 'energy' 
              ? 'bg-yellow-500/20 text-yellow-300' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          onClick={() => handleTypeChange('energy')}
        >
          <Sun className="w-6 h-6" />
        </button>

        <button
          className={`p-3 rounded-full backdrop-blur-lg transition-all
            ${activeType === 'flow' 
              ? 'bg-blue-500/20 text-blue-300' 
              : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
          onClick={() => handleTypeChange('flow')}
        >
          <Wind className="w-6 h-6" />
        </button>
      </div>

      {/* Environmental indicators */}
      <div className="flex flex-col gap-2 bg-black/20 backdrop-blur-lg p-2 rounded-lg">
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Sun className="w-4 h-4" />
          <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-400/50 transition-all"
              style={{ width: `${environmentalFactors[0] * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <Droplet className="w-4 h-4" />
          <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-400/50 transition-all"
              style={{ width: `${environmentalFactors[1] * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-white/70">
          <Wind className="w-4 h-4" />
          <div className="w-20 h-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-400/50 transition-all"
              style={{ width: `${environmentalFactors[2] * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 text-xs text-white/70 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
        {activeType === 'growth' && 'Plant & nurture'}
        {activeType === 'energy' && 'Add energy'}
        {activeType === 'flow' && 'Guide flow'}
      </div>
    </div>
  );
};

export default Controls;