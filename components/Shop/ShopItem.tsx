/**
 * ShopItem Component
 * Requirements: 2.1, 2.4 - Item preview, price, unlock status, purchase and equip buttons
 */

import React, { useState } from 'react';
import { Gem, Check, Lock } from 'lucide-react';
import { ItemCategory } from '../../store/gameStore';

interface ShopItemProps {
  id: string;
  name: string;
  price: number;
  category: ItemCategory;
  isOwned: boolean;
  isEquipped: boolean;
  onPurchase: (itemId: string, category: ItemCategory, price: number) => boolean;
  onEquip: (itemId: string, category: ItemCategory) => void;
  balance: number;
  preview: React.ReactNode;
}

const ShopItem: React.FC<ShopItemProps> = ({
  id,
  name,
  price,
  category,
  isOwned,
  isEquipped,
  onPurchase,
  onEquip,
  balance,
  preview,
}) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(false);

  const canAfford = balance >= price;
  const isFree = price === 0;

  const handlePurchase = () => {
    if (isOwned || !canAfford) return;
    
    setIsPurchasing(true);
    setPurchaseError(false);
    
    const success = onPurchase(id, category, price);
    
    if (!success) {
      setPurchaseError(true);
      setTimeout(() => setPurchaseError(false), 1500);
    }
    
    setIsPurchasing(false);
  };

  const handleEquip = () => {
    if (!isOwned || isEquipped) return;
    onEquip(id, category);
  };

  return (
    <div
      className={`relative flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
        isEquipped
          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
          : isOwned
          ? 'bg-white/5 border-white/20 hover:border-white/30'
          : canAfford
          ? 'bg-white/5 border-white/10 hover:border-cyan-500/30 hover:bg-cyan-500/5'
          : 'bg-white/5 border-white/10 opacity-60'
      }`}
    >
      {/* Equipped Badge */}
      {isEquipped && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center shadow-lg">
          <Check className="w-4 h-4 text-black" />
        </div>
      )}

      {/* Preview */}
      <div className="relative w-full h-16 flex items-center justify-center mb-2">
        {preview}
      </div>

      {/* Name */}
      <span className="text-sm font-medium text-white mb-2 text-center truncate w-full">
        {name}
      </span>

      {/* Price or Status */}
      {isOwned ? (
        isEquipped ? (
          <span className="text-xs text-cyan-400 font-medium tracking-wider">
            DONATILDI
          </span>
        ) : (
          <button
            onClick={handleEquip}
            className="px-4 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            DONAT
          </button>
        )
      ) : isFree ? (
        <span className="text-xs text-green-400 font-medium">ÜCRETSİZ</span>
      ) : (
        <button
          onClick={handlePurchase}
          disabled={!canAfford || isPurchasing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            purchaseError
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : canAfford
              ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30'
              : 'bg-white/5 text-white/40 border border-white/10 cursor-not-allowed'
          }`}
        >
          {!canAfford && <Lock className="w-3 h-3" />}
          <Gem className="w-3 h-3" />
          <span>{price.toLocaleString()}</span>
        </button>
      )}
    </div>
  );
};

export default ShopItem;
