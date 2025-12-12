/**
 * RatePrompt UI Component
 * Requirements: 6.3, 6.4, 6.5, 6.6
 * 
 * Displays the "Enjoying Echo Shift?" prompt to happy players.
 * Allows rating or dismissing the prompt.
 */

import React, { useCallback } from 'react';
import { Star, ThumbsUp, ThumbsDown, X } from 'lucide-react';

interface RatePromptProps {
  /** Callback when player responds positively (wants to rate) */
  onPositive: () => void;
  /** Callback when player responds negatively */
  onNegative: () => void;
  /** Callback when player dismisses the prompt */
  onDismiss: () => void;
}

/**
 * RatePrompt Component
 * Requirements 6.3: Display "Enjoying Echo Shift?" prompt
 */
const RatePrompt: React.FC<RatePromptProps> = ({
  onPositive,
  onNegative,
  onDismiss,
}) => {
  const handlePositive = useCallback(() => {
    onPositive();
  }, [onPositive]);

  const handleNegative = useCallback(() => {
    onNegative();
  }, [onNegative]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      
      {/* Modal - Mobile optimized */}
      <div className="relative z-10 w-[calc(100%-2rem)] max-w-xs mx-auto bg-gradient-to-b from-gray-900 to-black border border-cyan-500/30 rounded-xl shadow-[0_0_30px_rgba(0,240,255,0.2)] overflow-hidden">
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Header with stars - Compact */}
        <div className="pt-6 pb-3 px-4 text-center">
          <div className="flex justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star 
                key={i} 
                className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-pulse"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
          
          {/* Requirements 6.3: "Enjoying Echo Shift?" prompt */}
          <h2 className="text-lg sm:text-xl font-bold text-white mb-1 tracking-wide">
            Echo Shift'i Beğendin mi?
          </h2>
          <p className="text-gray-400 text-xs">
            Geri bildirimin bize yardımcı olur!
          </p>
        </div>
        
        {/* Buttons - Compact */}
        <div className="px-4 pb-4 space-y-2">
          
          {/* Requirements 6.4: Yes button */}
          <button
            onClick={handlePositive}
            className="group flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-bold text-sm tracking-widest active:scale-[0.98] transition-all duration-300 rounded-lg"
          >
            <ThumbsUp className="w-4 h-4" />
            EVET, PUANLA!
          </button>
          
          {/* Requirements 6.5: No button */}
          <button
            onClick={handleNegative}
            className="group flex items-center justify-center gap-2 w-full py-2.5 border border-gray-600 text-gray-300 font-bold text-sm tracking-widest hover:bg-gray-800 transition-all duration-300 rounded-lg"
          >
            <ThumbsDown className="w-4 h-4" />
            PEK DEĞİL
          </button>
          
          {/* Requirements 6.6: Dismiss option */}
          <button
            onClick={handleDismiss}
            className="w-full py-1.5 text-gray-500 text-xs hover:text-gray-300 transition-colors"
          >
            Belki sonra
          </button>
        </div>
        
        {/* Decorative bottom border */}
        <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
      </div>
    </div>
  );
};

export default RatePrompt;
