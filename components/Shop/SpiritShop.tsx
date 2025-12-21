/**
 * Spirit Shop Component - Spirit of the Resonance
 * Professional Pokemon character shop with tier-based styling and animations
 */

import { Gem, Ghost, Loader2, Shield, Sparkles, Star, Swords, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SpiritCharacter, TYPE_COLORS } from '../../api/pokeApi';
import { getAnalyticsSystem } from '../../App';
import { useCharacterStore } from '../../store/characterStore';
import { useGameStore } from '../../store/gameStore';
import * as AudioSystem from '../../systems/audioSystem';
import { calculateCharacterModifiers, getModifierSummary } from '../../utils/statMapper';

interface SpiritShopProps {
    onCharacterSelect?: (char: SpiritCharacter | null) => void;
}

const SpiritShop: React.FC<SpiritShopProps> = ({ onCharacterSelect }) => {
    const [selectedSpirit, setSelectedSpirit] = useState<SpiritCharacter | null>(null);
    const [purchaseAnimation, setPurchaseAnimation] = useState<number | null>(null);

    // Character store
    const {
        characterCache,
        ownedCharacterIds,
        activeCharacter,
        isLoading,
        error,
        loadStarterSpirits,
        setActiveCharacter,
        purchaseCharacter,
        isCharacterOwned,
    } = useCharacterStore();

    // Game store for gems
    const echoShards = useGameStore((state) => state.echoShards);
    const spendEchoShards = useGameStore((state) => state.spendEchoShards);

    // Load spirits on mount
    useEffect(() => {
        loadStarterSpirits();
    }, [loadStarterSpirits]);

    // Get spirits sorted by tier
    const spirits = Object.values(characterCache).sort((a, b) => {
        const tierOrder = { legendary: 0, rare: 1, common: 2 };
        return tierOrder[a.tier] - tierOrder[b.tier] || a.price - b.price;
    });

    const handlePurchase = (spirit: SpiritCharacter) => {
        if (isCharacterOwned(spirit.id)) return;
        if (echoShards < spirit.price) return;

        const success = purchaseCharacter(spirit, spendEchoShards);

        if (success) {
            setPurchaseAnimation(spirit.id);
            setTimeout(() => setPurchaseAnimation(null), 1000);

            AudioSystem.playPurchase();
            getAnalyticsSystem().logEvent('purchase', {
                item_id: `spirit_${spirit.id}`,
                item_category: 'spirit',
                price: spirit.price,
            });
        }
    };

    const handleEquip = (spirit: SpiritCharacter) => {
        if (!isCharacterOwned(spirit.id)) return;

        const newActive = activeCharacter?.id === spirit.id ? null : spirit;
        setActiveCharacter(newActive);
        onCharacterSelect?.(newActive);

        AudioSystem.playNearMiss();
    };

    const getTierBorderClass = (tier: string) => {
        switch (tier) {
            case 'legendary':
                return 'border-2 border-transparent bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-border animate-pulse';
            case 'rare':
                return 'border-2 border-yellow-500/60';
            default:
                return 'border border-cyan-500/30';
        }
    };

    const getTierGlowClass = (tier: string) => {
        switch (tier) {
            case 'legendary':
                return 'shadow-[0_0_20px_rgba(168,85,247,0.4)]';
            case 'rare':
                return 'shadow-[0_0_15px_rgba(234,179,8,0.3)]';
            default:
                return '';
        }
    };

    if (isLoading && spirits.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="text-sm text-white/60">Ruhlar yükleniyor...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Ghost className="w-8 h-8 text-red-400" />
                <span className="text-sm text-red-400">{error}</span>
                <button
                    onClick={() => loadStarterSpirits()}
                    className="px-4 py-2 text-xs bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30"
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Active Spirit Display */}
            {activeCharacter && (
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30">
                    <div className="flex items-center gap-3">
                        <img
                            src={activeCharacter.spriteUrl}
                            alt={activeCharacter.name}
                            className="w-12 h-12 pixelated"
                            style={{ imageRendering: 'pixelated' }}
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{activeCharacter.displayName}</span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">
                                    AKTİF
                                </span>
                            </div>
                            <div className="flex gap-1 mt-1">
                                {getModifierSummary(calculateCharacterModifiers(activeCharacter)).slice(0, 2).map((mod, i) => (
                                    <span key={i} className="text-[10px] text-cyan-400">{mod}</span>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => { setActiveCharacter(null); onCharacterSelect?.(null); }}
                            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded-lg"
                        >
                            Çıkar
                        </button>
                    </div>
                </div>
            )}

            {/* Spirit Grid */}
            <div className="grid grid-cols-2 gap-2">
                {spirits.map((spirit) => {
                    const isOwned = isCharacterOwned(spirit.id);
                    const isEquipped = activeCharacter?.id === spirit.id;
                    const canAfford = echoShards >= spirit.price;
                    const isPurchasing = purchaseAnimation === spirit.id;
                    const modifiers = calculateCharacterModifiers(spirit);
                    const primaryType = spirit.types[0];
                    const typeColor = TYPE_COLORS[primaryType] || '#00F0FF';

                    return (
                        <div
                            key={spirit.id}
                            className={`relative rounded-xl overflow-hidden transition-all duration-300 ${isEquipped
                                ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black'
                                : ''
                                } ${getTierGlowClass(spirit.tier)}`}
                            style={{
                                background: spirit.tier === 'legendary'
                                    ? 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.2), rgba(234,179,8,0.2))'
                                    : 'rgba(255,255,255,0.05)',
                            }}
                        >
                            {/* Tier Badge */}
                            {spirit.tier !== 'common' && (
                                <div className={`absolute top-1 right-1 z-10 ${spirit.tier === 'legendary' ? 'text-purple-400' : 'text-yellow-400'
                                    }`}>
                                    <Star className="w-4 h-4" fill="currentColor" />
                                </div>
                            )}

                            {/* Content */}
                            <div className={`p-3 border rounded-xl ${getTierBorderClass(spirit.tier)} ${isPurchasing ? 'animate-pulse bg-green-500/20' : ''
                                }`}>
                                {/* Sprite with Type Glow */}
                                <div
                                    className="relative w-full h-16 flex items-center justify-center mb-2"
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${typeColor}40)`,
                                    }}
                                >
                                    <img
                                        src={spirit.spriteUrl}
                                        alt={spirit.name}
                                        className="w-14 h-14 object-contain transition-transform hover:scale-110"
                                        style={{ imageRendering: 'pixelated' }}
                                        loading="lazy"
                                    />

                                    {/* Type indicator dots */}
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-1">
                                        {spirit.types.map((type) => (
                                            <div
                                                key={type}
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: TYPE_COLORS[type] || '#888' }}
                                                title={type}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Name */}
                                <div className="text-center mb-2">
                                    <span className="text-sm font-medium text-white">{spirit.displayName}</span>
                                </div>

                                {/* Stats & VFX Preview */}
                                <div className="space-y-2 mb-3">
                                    <div className="flex justify-center gap-3 text-[10px] text-white/70">
                                        <div className="flex items-center gap-1" title="Hız">
                                            <Zap className="w-3 h-3 text-yellow-400" />
                                            {spirit.stats.speed}
                                        </div>
                                        <div className="flex items-center gap-1" title="Savunma">
                                            <Shield className="w-3 h-3 text-blue-400" />
                                            {spirit.stats.defense}
                                        </div>
                                        <div className="flex items-center gap-1" title="Saldırı">
                                            <Swords className="w-3 h-3 text-red-400" />
                                            {spirit.stats.attack}
                                        </div>
                                    </div>

                                    {/* VFX Info Badge */}
                                    <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/10 group-hover:border-cyan-500/30 transition-colors">
                                        <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                                        <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-tighter">
                                            {primaryType} VFX AKTİF
                                        </span>
                                    </div>
                                </div>

                                {/* Action Button */}
                                {isOwned ? (
                                    isEquipped ? (
                                        <div className="flex items-center justify-center gap-1 py-1.5 text-xs text-cyan-400 font-medium">
                                            <Sparkles className="w-3 h-3" />
                                            DONATILDI
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleEquip(spirit)}
                                            className="w-full py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                        >
                                            DONAT
                                        </button>
                                    )
                                ) : (
                                    <button
                                        onClick={() => handlePurchase(spirit)}
                                        disabled={!canAfford}
                                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${canAfford
                                            ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
                                            : 'bg-white/5 text-white/30 border border-white/10 cursor-not-allowed'
                                            }`}
                                    >
                                        <Gem className="w-3 h-3" />
                                        <span>{spirit.price.toLocaleString()}</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Empty State */}
            {spirits.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Ghost className="w-8 h-8 text-white/30" />
                    <span className="text-sm text-white/50">Henüz ruh yok</span>
                </div>
            )}
        </div>
    );
};

export default SpiritShop;
