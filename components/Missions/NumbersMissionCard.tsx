/**
 * NumbersMissionCard Component
 * Displays the Numbers Mission with API data, cooldown timer, and start button
 */

import { Clock, Gem, Play, Sparkles, Target, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { NUMBERS_MISSION_REWARDS, TRIAL_POKEMON } from '../../systems/numbersMissionService';
import type { NumbersMissionData } from '../../types';

interface NumbersMissionCardProps {
    mission: NumbersMissionData | null;
    isOnCooldown: boolean;
    timeLeft: number;
    isLoading: boolean;
    error: string | null;
    onStartMission: (pokemonId?: string) => void;
    onFetchMission: () => void;
}

const NumbersMissionCard: React.FC<NumbersMissionCardProps> = ({
    mission,
    isOnCooldown,
    timeLeft,
    isLoading,
    error,
    onStartMission,
    onFetchMission,
}) => {
    const [selectedPokemon, setSelectedPokemon] = useState<string | null>(null);

    // Auto-fetch mission when available and not loaded
    useEffect(() => {
        if (!mission && !isLoading && !isOnCooldown && !error) {
            onFetchMission();
        }
    }, [mission, isLoading, isOnCooldown, error, onFetchMission]);

    // Format cooldown time
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
    };

    // Cooldown state
    if (isOnCooldown) {
        return (
            <div className="p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-yellow-500/30 rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-yellow-500/20">
                        <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-yellow-400 tracking-wide">SAYI GÖREVİ</h3>
                        <p className="text-yellow-400/60 text-xs">Bekleme Süresi</p>
                    </div>
                </div>

                <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <div className="text-5xl font-black text-yellow-400 tabular-nums mb-2">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-gray-400 text-sm">Yeni görev için bekleyin</p>
                    </div>
                </div>

                <div className="mt-4 p-2 bg-white/5 rounded-lg text-center">
                    <span className="text-gray-500 text-xs">
                        Cooldown bittikten sonra yeni hedef yüklenecek
                    </span>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-cyan-500/30 rounded-xl">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-cyan-400 text-sm">Hedef yükleniyor...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-red-500/30 rounded-xl">
                <div className="text-center py-6">
                    <p className="text-red-400 mb-3">{error}</p>
                    <button
                        onClick={onFetchMission}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </div>
        );
    }

    // No mission loaded
    if (!mission) {
        return (
            <div className="p-4 bg-gradient-to-br from-gray-900/80 to-gray-800/60 border border-cyan-500/30 rounded-xl">
                <div className="text-center py-6">
                    <button
                        onClick={onFetchMission}
                        className="px-6 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors font-bold"
                    >
                        Yeni Hedef Yükle
                    </button>
                </div>
            </div>
        );
    }

    // Mission available
    return (
        <div className="p-4 bg-gradient-to-br from-gray-900/80 to-cyan-900/20 border border-cyan-500/30 rounded-xl overflow-hidden relative">
            {/* Animated background glow */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" />
            </div>

            {/* Header */}
            <div className="relative flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Target className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white tracking-wide">SAYI GÖREVİ</h3>
                    <p className="text-cyan-400/60 text-xs">Numbers API Challenge</p>
                </div>
            </div>

            {/* Target Number - Big and Glowing */}
            <div className="relative text-center py-6">
                <div
                    className="text-6xl font-black text-cyan-400 tracking-tight"
                    style={{
                        textShadow: '0 0 30px rgba(0, 240, 255, 0.5), 0 0 60px rgba(0, 240, 255, 0.3)',
                    }}
                >
                    {mission.number}
                    <span className="text-2xl text-cyan-400/60 ml-1">m</span>
                </div>
            </div>

            {/* Trivia Text */}
            <div className="relative bg-black/30 rounded-lg p-3 mb-4">
                <p className="text-gray-300 text-sm italic leading-relaxed">
                    "{mission.text}"
                </p>
            </div>

            {/* Trial Pokemon Selection */}
            <div className="relative mb-4">
                <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 text-xs font-bold tracking-wide">DENEME POKéMON</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {TRIAL_POKEMON.map((pokemon) => (
                        <button
                            key={pokemon.id}
                            onClick={() => setSelectedPokemon(
                                selectedPokemon === pokemon.id ? null : pokemon.id
                            )}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedPokemon === pokemon.id
                                    ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {pokemon.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rewards Preview */}
            <div className="relative flex items-center justify-center gap-4 mb-4 p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-1.5">
                    <Gem className="w-4 h-4 text-cyan-400" />
                    <span className="text-cyan-400 font-bold">+{NUMBERS_MISSION_REWARDS.gems}</span>
                </div>
                <div className="w-px h-4 bg-white/20" />
                <div className="flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">+{NUMBERS_MISSION_REWARDS.xp} XP</span>
                </div>
            </div>

            {/* Start Button */}
            <button
                onClick={() => onStartMission(selectedPokemon || undefined)}
                className="relative w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-black text-lg tracking-widest rounded-lg shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
                <Play className="w-5 h-5 fill-black" />
                GÖREVE BAŞLA
            </button>
        </div>
    );
};

export default NumbersMissionCard;
