import React from 'react';
import { GameState } from '../../../types';

interface MobileControlsHintProps {
    isMobile: boolean;
    gameState: GameState;
    showMobileHint: boolean;
}

export const MobileControlsHint: React.FC<MobileControlsHintProps> = ({
    isMobile,
    gameState,
    showMobileHint
}) => {
    if (!isMobile || gameState !== GameState.PLAYING || !showMobileHint) {
        return null;
    }

    return (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none transition-opacity duration-500 z-10">
            <div className="flex flex-col items-center gap-1 text-white/60 text-sm bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-lg">↕</span>
                    <span>Basılı tut & kaydır</span>
                </div>
                <div className="flex items-center gap-2">
                    <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
                        <path d="M7 16V4M7 4L3 8M7 4L11 8" />
                        <path d="M17 8V20M17 20L21 16M17 20L13 16" />
                    </svg>
                    <span>Bırak = Dön</span>
                </div>
            </div>
        </div>
    );
};
