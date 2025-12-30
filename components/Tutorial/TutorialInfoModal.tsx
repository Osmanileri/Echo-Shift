import { CheckCircle, RotateCw, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface TutorialInfoModalProps {
    isVisible: boolean;
    onClose: () => void;
    title: string;
    description: string;
    showVisuals?: boolean;
}

/**
 * Animated Modal for explaining critical mechanics
 * Used in tutorial Phases to pause and explain
 */
export const TutorialInfoModal: React.FC<TutorialInfoModalProps> = ({
    isVisible,
    onClose,
    title,
    description,
    showVisuals = true
}) => {
    const [canClose, setCanClose] = useState(false);

    // Prevent immediate closing to ensure user sees animation
    useEffect(() => {
        if (isVisible) {
            setCanClose(false);
            const timer = setTimeout(() => setCanClose(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-gray-900 border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)] animate-scale-in">

                {/* Header Icon */}
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-40 animate-pulse" />
                        <div className="relative w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center border-2 border-cyan-500">
                            <RotateCw className="w-10 h-10 text-cyan-400 animate-spin-slow" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-3">
                    {title}
                </h2>

                {/* Description */}
                <p className="text-gray-300 text-center mb-8 leading-relaxed">
                    {description}
                </p>

                {/* Visual Demonstration (Mini Animation) */}
                {showVisuals && (
                    <div className="bg-black/50 rounded-xl p-4 mb-8 border border-white/10 flex justify-center gap-8">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full border-4 border-red-500 flex items-center justify-center bg-red-900/20">
                                <X className="w-6 h-6 text-red-500" />
                            </div>
                            <span className="text-xs text-red-400 font-bold">ÇARPMA</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full border-4 border-green-500 flex items-center justify-center bg-green-900/20">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <span className="text-xs text-green-400 font-bold">DÖNDÜR</span>
                        </div>
                    </div>
                )}

                {/* Action Button */}
                <button
                    onClick={onClose}
                    disabled={!canClose}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${canClose
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {canClose ? "HAZIRIM! 🚀" : "Bekle..."}
                </button>

            </div>
        </div>
    );
};
