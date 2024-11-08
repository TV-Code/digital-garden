import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Settings } from 'lucide-react';

interface ControlsProps {
  onAddOrganism: () => void;
}

const Controls: React.FC<ControlsProps> = ({ onAddOrganism }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 left-8">
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.button
          className="bg-white/10 backdrop-blur-lg rounded-full p-4 
                     text-white hover:bg-white/20 transition-colors"
          onClick={onAddOrganism}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>

        <motion.button
          className="bg-white/10 backdrop-blur-lg rounded-full p-4 
                     text-white hover:bg-white/20 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="w-6 h-6" />
        </motion.button>
      </motion.div>

      {isOpen && (
        <motion.div
          className="absolute bottom-full mb-4 bg-white/10 backdrop-blur-lg 
                     rounded-lg p-4 text-white min-w-[200px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="space-y-4">
            <div className="text-sm font-medium">Evolution Speed</div>
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                onClick={() => {/* Implement speed control */}}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">1x</div>
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                onClick={() => {/* Implement speed control */}}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Controls;