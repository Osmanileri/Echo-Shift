import { Gem, Lock, X } from "lucide-react";
import React from "react";
import type { ZoneConfig } from "../../data/zones";

interface ZoneUnlockModalProps {
  isOpen: boolean;
  zone: ZoneConfig | null;
  balance: number;
  onClose: () => void;
  onConfirmUnlock: (zone: ZoneConfig) => void;
}

export const ZoneUnlockModal: React.FC<ZoneUnlockModalProps> = ({
  isOpen,
  zone,
  balance,
  onClose,
  onConfirmUnlock,
}) => {
  if (!isOpen || !zone) return null;

  const canAfford = balance >= zone.unlockCost;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-b from-gray-900 to-black">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${zone.gradient.from} ${zone.gradient.via} ${zone.gradient.to}`}
        />

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase">
                Zone Unlock
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

        {/* Body */}
        <div className="relative p-4">
          <p className="text-sm text-white/70 leading-relaxed">
            <span className="font-semibold text-white">Bu zone kilitli.</span>{" "}
            Açmak için Echo Shards harcayabilirsin.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 tracking-wider uppercase">
                Ücret
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Gem className="w-4 h-4 text-cyan-400" />
                <span className="text-lg font-black text-cyan-400">
                  {zone.unlockCost.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-[10px] text-white/40 tracking-wider uppercase">
                Bakiye
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Gem className="w-4 h-4 text-white/60" />
                <span className="text-lg font-black text-white/80">
                  {balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-black/30 border border-white/10">
            <p className="text-[10px] text-white/40 tracking-wider uppercase">
              Modifikasyon
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
                Hız x{zone.modifiers.speedMultiplier.toFixed(2)}
              </span>
              <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/70">
                Spawn x{zone.modifiers.spawnRateMultiplier.toFixed(2)}
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
            VAZGEÇ
          </button>
          <button
            onClick={() => onConfirmUnlock(zone)}
            disabled={!canAfford}
            className={`flex-1 py-3 rounded-xl font-black text-xs tracking-[0.2em] transition-all ${
              canAfford
                ? "bg-gradient-to-r from-cyan-500 to-cyan-400 text-black active:scale-[0.98] shadow-[0_0_25px_rgba(0,240,255,0.25)]"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            AÇ
          </button>
        </div>
      </div>
    </div>
  );
};
