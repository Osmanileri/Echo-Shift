/**
 * Shop Component
 * Requirements: 2.1 - Display all available cosmetic items with prices and unlock status
 * Requirements: 5.3 - Log purchase events to analytics
 */

import React, { useState } from 'react';
import { X, Gem, Palette, Sparkles, Zap, Clock, TrendingUp, Play } from 'lucide-react';
import { useGameStore, ItemCategory } from '../../store/gameStore';
import { BALL_SKINS, BallSkin } from '../../data/skins';
import { THEMES, Theme } from '../../data/themes';
import { UPGRADES, getUpgradeCost, getUpgradeEffect } from '../../data/upgrades';
import { purchaseUpgrade } from '../../systems/upgradeSystem';
import ShopItem from './ShopItem';
// Analytics System - Requirements 5.3
import { getAnalyticsSystem } from '../../App';

type ShopCategory = 'skins' | 'themes' | 'upgrades';

interface ShopProps {
  isOpen: boolean;
  onClose: () => void;
}

const Shop: React.FC<ShopProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('skins');
  
  const echoShards = useGameStore((state) => state.echoShards);
  const ownedSkins = useGameStore((state) => state.ownedSkins);
  const ownedThemes = useGameStore((state) => state.ownedThemes);
  const ownedUpgrades = useGameStore((state) => state.ownedUpgrades);
  const equippedSkin = useGameStore((state) => state.equippedSkin);
  const equippedTheme = useGameStore((state) => state.equippedTheme);
  const purchaseItem = useGameStore((state) => state.purchaseItem);
  const equipItem = useGameStore((state) => state.equipItem);

  if (!isOpen) return null;

  const categories: { id: ShopCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'skins', label: 'Skinler', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'themes', label: 'Temalar', icon: <Palette className="w-4 h-4" /> },
    { id: 'upgrades', label: 'Yükseltmeler', icon: <Zap className="w-4 h-4" /> },
  ];

  const handlePurchase = (itemId: string, category: ItemCategory, price: number): boolean => {
    const success = purchaseItem(itemId, category, price);
    
    // Analytics: Log purchase event - Requirements 5.3
    if (success) {
      getAnalyticsSystem().logEvent('purchase', {
        item_id: itemId,
        item_category: category,
        price: price,
      });
      getAnalyticsSystem().flush();
    }
    
    return success;
  };

  const handleEquip = (itemId: string, category: ItemCategory) => {
    equipItem(itemId, category);
  };

  const renderSkins = () => (
    <div className="grid grid-cols-2 gap-2">
      {BALL_SKINS.map((skin: BallSkin) => (
        <ShopItem
          key={skin.id}
          id={skin.id}
          name={skin.name}
          price={skin.price}
          category="skin"
          isOwned={ownedSkins.includes(skin.id)}
          isEquipped={equippedSkin === skin.id}
          onPurchase={handlePurchase}
          onEquip={handleEquip}
          balance={echoShards}
          preview={<SkinPreview skin={skin} />}
        />
      ))}
    </div>
  );

  const renderThemes = () => (
    <div className="grid grid-cols-2 gap-2">
      {THEMES.map((theme: Theme) => (
        <ShopItem
          key={theme.id}
          id={theme.id}
          name={theme.name}
          price={theme.price}
          category="theme"
          isOwned={ownedThemes.includes(theme.id)}
          isEquipped={equippedTheme === theme.id}
          onPurchase={handlePurchase}
          onEquip={handleEquip}
          balance={echoShards}
          preview={<ThemePreview theme={theme} />}
        />
      ))}
    </div>
  );

  const handleUpgradePurchase = (upgradeId: string) => {
    const upgrade = UPGRADES.find(u => u.id === upgradeId);
    const currentLevel = ownedUpgrades[upgradeId] || 0;
    const cost = upgrade ? getUpgradeCost(upgrade, currentLevel) : 0;
    
    const success = purchaseUpgrade(upgradeId);
    
    // Analytics: Log purchase event - Requirements 5.3
    if (success) {
      getAnalyticsSystem().logEvent('purchase', {
        item_id: upgradeId,
        item_category: 'upgrade',
        price: cost,
      });
      getAnalyticsSystem().flush();
    }
  };

  const getUpgradeIcon = (upgradeId: string) => {
    switch (upgradeId) {
      case 'starting-score':
        return <Play className="w-6 h-6 text-green-400" />;
      case 'score-multiplier':
        return <TrendingUp className="w-6 h-6 text-yellow-400" />;
      case 'slow-motion':
        return <Clock className="w-6 h-6 text-purple-400" />;
      default:
        return <Zap className="w-6 h-6 text-cyan-400" />;
    }
  };

  const getEffectDisplay = (upgradeId: string, level: number) => {
    const effect = getUpgradeEffect(UPGRADES.find(u => u.id === upgradeId)!, level);
    switch (upgradeId) {
      case 'starting-score':
        return `+${effect} başlangıç skoru`;
      case 'score-multiplier':
        return `x${effect.toFixed(1)} skor çarpanı`;
      case 'slow-motion':
        return `${effect} kullanım/oyun`;
      default:
        return `${effect}`;
    }
  };

  const renderUpgrades = () => (
    <div className="space-y-2">
      {UPGRADES.map((upgrade) => {
        const currentLevel = ownedUpgrades[upgrade.id] || 0;
        const isMaxed = currentLevel >= upgrade.maxLevel;
        const cost = isMaxed ? 0 : getUpgradeCost(upgrade, currentLevel);
        const canAfford = echoShards >= cost;
        
        return (
          <div
            key={upgrade.id}
            className={`p-3 rounded-lg border transition-all ${
              isMaxed
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-start gap-2">
              {/* Icon - Smaller */}
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                isMaxed ? 'bg-green-500/20' : 'bg-white/10'
              }`}>
                {getUpgradeIcon(upgrade.id)}
              </div>
              
              {/* Info - Compact */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className="font-bold text-white text-xs sm:text-sm truncate">{upgrade.name}</h3>
                  <span className="text-[10px] text-white/50 flex-shrink-0 ml-1">
                    {currentLevel}/{upgrade.maxLevel}
                  </span>
                </div>
                <p className="text-[10px] text-white/60 mb-1 line-clamp-1">{upgrade.description}</p>
                
                {/* Current Effect */}
                {currentLevel > 0 && (
                  <p className="text-[10px] text-cyan-400">
                    {getEffectDisplay(upgrade.id, currentLevel)}
                  </p>
                )}
              </div>
              
              {/* Purchase Button - Compact */}
              <div className="flex-shrink-0">
                {isMaxed ? (
                  <span className="px-2 py-1 text-[10px] font-bold text-green-400 bg-green-500/20 rounded-full">
                    MAX
                  </span>
                ) : (
                  <button
                    onClick={() => handleUpgradePurchase(upgrade.id)}
                    disabled={!canAfford}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg font-bold text-xs transition-all ${
                      canAfford
                        ? 'bg-cyan-500 text-black active:scale-95'
                        : 'bg-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    <Gem className="w-3 h-3" />
                    {cost.toLocaleString()}
                  </button>
                )}
              </div>
            </div>
            
            {/* Level Progress Bar - Thinner */}
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isMaxed ? 'bg-green-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${(currentLevel / upgrade.maxLevel) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="relative w-full max-w-xs sm:max-w-sm max-h-[90vh] bg-gradient-to-b from-gray-900 to-black rounded-xl border border-white/10 overflow-hidden flex flex-col">
        {/* Header - Compact */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-bold text-white tracking-wider">MAĞAZA</h2>
          <div className="flex items-center gap-2">
            {/* Balance Display */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/30">
              <Gem className="w-3 h-3 text-cyan-400" />
              <span className="text-xs font-bold text-cyan-400">{echoShards.toLocaleString()}</span>
            </div>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        {/* Category Tabs - Compact */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs font-medium transition-colors ${
                activeCategory === cat.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/5'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }`}
            >
              {cat.icon}
              <span className="hidden sm:inline">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content - Scrollable */}
        <div className="p-3 overflow-y-auto flex-1">
          {activeCategory === 'skins' && renderSkins()}
          {activeCategory === 'themes' && renderThemes()}
          {activeCategory === 'upgrades' && renderUpgrades()}
        </div>
      </div>
    </div>
  );
};

// Skin Preview Component
const SkinPreview: React.FC<{ skin: BallSkin }> = ({ skin }) => {
  const getOrbStyle = () => {
    if (skin.type === 'gradient' && skin.config.gradient) {
      return {
        background: `linear-gradient(135deg, ${skin.config.gradient.start}, ${skin.config.gradient.end})`,
        boxShadow: skin.config.glowColor ? `0 0 10px ${skin.config.glowColor}` : undefined,
      };
    }
    if (skin.type === 'solid') {
      return {
        background: skin.config.topColor || '#FFFFFF',
      };
    }
    return {};
  };

  if (skin.type === 'emoji') {
    return (
      <div className="flex items-center justify-center w-12 h-12 text-2xl">
        {skin.config.emoji}
      </div>
    );
  }

  return (
    <div
      className="w-10 h-10 rounded-full"
      style={getOrbStyle()}
    />
  );
};

// Theme Preview Component
const ThemePreview: React.FC<{ theme: Theme }> = ({ theme }) => {
  return (
    <div className="w-full h-12 rounded-lg overflow-hidden flex flex-col">
      <div
        className="flex-1"
        style={{ backgroundColor: theme.colors.topBg }}
      />
      <div
        className="flex-1"
        style={{ backgroundColor: theme.colors.bottomBg }}
      />
      <div
        className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2"
        style={{ backgroundColor: theme.colors.accent }}
      />
    </div>
  );
};

export default Shop;
