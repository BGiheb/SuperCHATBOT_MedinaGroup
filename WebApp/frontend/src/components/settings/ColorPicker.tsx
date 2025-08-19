import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const colorOptions = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
];

const ColorPicker = () => {
  const [selectedColor, setSelectedColor] = useState('#3B82F6');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {colorOptions.map((color) => (
          <motion.div
            key={color.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="ghost"
              className={`w-full h-12 rounded-xl border-2 transition-all duration-200 ${
                selectedColor === color.value
                  ? 'border-white shadow-glow scale-105'
                  : 'border-transparent hover:border-white/20'
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => setSelectedColor(color.value)}
            >
              {selectedColor === color.value && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="w-5 h-5 text-white" />
                </motion.div>
              )}
            </Button>
            <p className="text-xs text-center mt-1 text-muted-foreground">
              {color.name}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Preview */}
      <div className="glass-card p-4 border border-glass-border">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold"
            style={{ backgroundColor: selectedColor }}
          >
            A
          </div>
          <div>
            <h3 className="font-semibold">Preview</h3>
            <p className="text-sm text-muted-foreground">
              This is how your interface will look
            </p>
          </div>
        </div>
        
        <div className="mt-4">
          <Button
            className="hover:scale-105 transition-transform duration-200 text-white"
            style={{ backgroundColor: selectedColor }}
          >
            Sample Button
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;