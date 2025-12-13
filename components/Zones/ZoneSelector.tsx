import { CheckCircle2, Gem, Link2, Lock } from "lucide-react";
import React, { useMemo } from "react";
import type { ZoneConfig, ZoneId } from "../../data/zones";

interface ZoneSelectorProps {
  zones: ZoneConfig[];
  selectedZoneId: ZoneId;
  unlockedZones: ZoneId[];
  balance: number;
  onSelect: (zoneId: ZoneId) => void;
  onUnlockRequest: (zone: ZoneConfig) => void;
}

export const ZoneSelector: React.FC<ZoneSelectorProps> = ({
  zones,
  selectedZoneId,
  unlockedZones,
  balance,
  onSelect,
  onUnlockRequest,
}) => {
  const unlockedSet = useMemo(() => new Set(unlockedZones), [unlockedZones]);

  return (
    <div className="w-full">
      <div className="flex items-end justify-between px-1 mb-2">
        <div>
          <p className="text-[10px] text-white/40 tracking-[0.25em] uppercase">
            Zone
          </p>
          <h3 className="text-sm font-bold text-white tracking-wider">
            Frekans Seç
          </h3>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
          <Gem className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-bold text-cyan-400">
            {balance.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory [-webkit-overflow-scrolling:touch]">
        {zones.map((zone) => {
          const isUnlocked = unlockedSet.has(zone.id);
          const isSelected = selectedZoneId === zone.id;
          const canAfford = balance >= zone.unlockCost;

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                if (isUnlocked) onSelect(zone.id);
                else onUnlockRequest(zone);
              }}
              className={`relative snap-start w-[260px] flex-shrink-0 rounded-2xl border overflow-hidden transition-all duration-300 ${
                isSelected
                  ? "border-cyan-400/60 bg-cyan-500/10 shadow-[0_0_25px_rgba(0,240,255,0.15)]"
                  : isUnlocked
                  ? "border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25"
                  : "border-white/10 bg-white/5 opacity-90"
              }`}
            >
              {/* Gradient wash */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${zone.gradient.from} ${zone.gradient.via} ${zone.gradient.to}`}
              />

              {/* Header */}
              <div className="relative p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: zone.accent }}
                      />
                      <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase truncate">
                        {zone.subtitle}
                      </p>
                    </div>
                    <h4 className="text-lg font-black tracking-[0.18em] text-white mt-1 truncate">
                      {zone.name}
                    </h4>
                  </div>

                  {isUnlocked ? (
                    isSelected ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[10px] font-bold text-cyan-400 tracking-wider">
                          SEÇİLİ
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                        <Link2 className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-[10px] font-bold text-white/70 tracking-wider">
                          SEÇ
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
                      <Lock className="w-3.5 h-3.5 text-white/60" />
                      <span className="text-[10px] font-bold text-white/60 tracking-wider">
                        KİLİTLİ
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-white/60 mt-2 leading-relaxed">
                  {zone.description}
                </p>
              </div>

              {/* Footer */}
              <div className="relative px-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] text-white/60">
                  <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    Hız x{zone.modifiers.speedMultiplier.toFixed(2)}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                    Spawn x{zone.modifiers.spawnRateMultiplier.toFixed(2)}
                  </span>
                </div>

                {!isUnlocked && (
                  <div
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${
                      canAfford
                        ? "border-cyan-500/30 bg-cyan-500/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Gem
                      className={`w-3 h-3 ${
                        canAfford ? "text-cyan-400" : "text-white/40"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold ${
                        canAfford ? "text-cyan-400" : "text-white/40"
                      }`}
                    >
                      {zone.unlockCost.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-white/30 mt-1 tracking-wider">
        Kilitli zone’a dokun → aç / Seçili zone → Start
      </p>
    </div>
  );
};
