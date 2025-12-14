/**
 * ZoneUnlockModal Component
 * Shows dual lock status with level and shard indicators
 * Displays appropriate messages for each lock state
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { CheckCircle, Gem, Lock, TrendingUp, X, XCircle } from "lucide-react";
import React from "react";
import type { ZoneConfig } from "../../data/zones";
import { getZoneUnlockStatus } from "../../systems/zoneUnlockSystem";
import type { ZoneUnlockState } from "../../types";

interface ZoneUnlockModalProps {
  isOpen: boolean;
  zone: ZoneConfig | null;
  balance: number;
  playerLevel: number;
  onClose: () => void;
  onConfirmUnlock: (zone: ZoneConfig) => void;
}

/**
 * Lock Status Indicator Component
 */
const LockIndicator: React.FC<{
  label: string;
  value: string | number;
  isMet: boolean;
  icon: React.ReactNode;
  required?: string | number;
}> = ({ label, value, isMet, icon, required }) => {
  return (
    <div className={`p-3 rounded-xl border transition-all ${
      isMet 
        ? 'bg-green-500/10 border-green-500/30' 
        : 'bg-red-500/10 border-red-500/30'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] text-white/40 tracking-wider uppercase">
          {label}
        </p>
        {isMet ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={isMet ? 'text-green-400' : 'text-red-400'}>
          {icon}
        </div>
        <span className={`text-lg font-black ${
          isMet ? 'text-green-400' : 'text-red-400'
        }`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {required !== undefined && !isMet && (
          <span className="text-xs text-white/40">
            / {typeof required === 'number' ? required.toLocaleString() : required}
          </span>
        )}
      </div>
    </div>
  );
};


/**
 * ZoneUnlockModal Component
 * Requirements 6.1: WHEN displaying a locked zone THEN the Zone_System SHALL show 
 * both Level requirement and Shard cost with individual lock status indicators
 * Requirements 6.2: WHEN the player meets neither requirement THEN the Zone_System 
 * SHALL display "Signal Too Weak. More experience required." with both indicators locked
 * Requirements 6.3: WHEN the player meets the Shard requirement but not the Level requirement 
 * THEN the Zone_System SHALL display "Synchronization Insufficient! (Required Rank: X)"
 * Requirements 6.4: WHEN the player meets the Level requirement but not the Shard requirement 
 * THEN the Zone_System SHALL display "Insufficient Data Shards."
 * Requirements 6.5: WHEN the player meets both requirements THEN the Zone_System 
 * SHALL enable the "UNLOCK FREQUENCY" button and allow purchase
 */
export const ZoneUnlockModal: React.FC<ZoneUnlockModalProps> = ({
  isOpen,
  zone,
  balance,
  playerLevel,
  onClose,
  onConfirmUnlock,
}) => {
  if (!isOpen || !zone) return null;

  // Get zone unlock status using the zoneUnlockSystem
  const unlockState: ZoneUnlockState = getZoneUnlockStatus(
    zone.unlockRequirements,
    playerLevel,
    balance,
    false // Not already unlocked (we're showing unlock modal)
  );

  // Determine status color based on state
  const getStatusColor = () => {
    switch (unlockState.status) {
      case 'UNLOCKABLE':
        return 'text-green-400';
      case 'LEVEL_LOCKED':
      case 'SHARD_LOCKED':
        return 'text-yellow-400';
      case 'FULLY_LOCKED':
      default:
        return 'text-red-400';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${zone.gradient.from} ${zone.gradient.via} ${zone.gradient.to}`}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              unlockState.canPurchase 
                ? 'bg-green-500/20 border border-green-500/30' 
                : 'bg-white/5 border border-white/10'
            }`}>
              <Lock className={`w-4 h-4 ${
                unlockState.canPurchase ? 'text-green-400' : 'text-white/70'
              }`} />
            </div>
            <div>
              <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase">
                Frekans Bölgesi
              </p>
              <h3 className="text-sm font-bold text-white tracking-wider">
                {zone.name}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Status Message */}
        <div className="relative px-4 pt-4">
          <div className={`p-3 rounded-xl border ${
            unlockState.canPurchase 
              ? 'bg-green-500/10 border-green-500/30' 
              : unlockState.status === 'FULLY_LOCKED'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-yellow-500/10 border-yellow-500/30'
          }`}>
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {unlockState.message}
            </p>
          </div>
        </div>

        {/* Body - Dual Lock Indicators */}
        <div className="relative p-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Level Requirement */}
            <LockIndicator
              label="Gereken Seviye"
              value={playerLevel}
              isMet={unlockState.levelMet}
              icon={<TrendingUp className="w-4 h-4" />}
              required={zone.unlockRequirements.levelRequired}
            />
            
            {/* Shard Requirement */}
            <LockIndicator
              label="Parça Maliyeti"
              value={balance}
              isMet={unlockState.shardsMet}
              icon={<Gem className="w-4 h-4" />}
              required={zone.unlockRequirements.shardCost}
            />
          </div>

          {/* Zone Modifiers */}
          <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/10">
            <p className="text-[10px] text-white/40 tracking-wider uppercase">
              Bölge Değiştiricileri
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
                Hız x{zone.modifiers.speedMultiplier.toFixed(2)}
              </span>
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
                Üretim x{zone.modifiers.spawnRateMultiplier.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative p-4 pt-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-white/70 font-bold text-xs tracking-widest hover:bg-white/5 transition-colors"
          >
            İPTAL
          </button>
          <button
            onClick={() => onConfirmUnlock(zone)}
            disabled={!unlockState.canPurchase}
            className={`flex-1 py-3 rounded-xl font-black text-xs tracking-[0.15em] transition-all ${
              unlockState.canPurchase
                ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-black active:scale-[0.98] shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            FREKANSI AÇ
          </button>
        </div>
      </div>
    </div>
  );
};
