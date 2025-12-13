import React, { useEffect, useMemo, useState } from "react";
import { Copy, Palette, Save, X } from "lucide-react";
import type { ThemeColors } from "../../data/themes";
import { useGameStore } from "../../store/gameStore";
import { contrastRatio } from "../../utils/colorContrast";
import { decodeThemeCode, encodeThemeCode } from "../../utils/themeCode";

interface ThemeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_CUSTOM_COLORS: ThemeColors = {
  topBg: "#000000",
  bottomBg: "#FFFFFF",
  topOrb: "#FFFFFF",
  bottomOrb: "#000000",
  connector: "#888888",
  accent: "#00F0FF",
  accentSecondary: "#FF2A2A",
  topObstacle: "#FFFFFF",
  bottomObstacle: "#000000",
};

type ColorKey = keyof ThemeColors;

const COLOR_FIELDS: Array<{ key: ColorKey; label: string }> = [
  { key: "topBg", label: "Top BG" },
  { key: "bottomBg", label: "Bottom BG" },
  { key: "topOrb", label: "Top Orb" },
  { key: "bottomOrb", label: "Bottom Orb" },
  { key: "connector", label: "Connector" },
  { key: "accent", label: "Accent" },
  { key: "accentSecondary", label: "Accent 2" },
  { key: "topObstacle", label: "Top Obstacle" },
  { key: "bottomObstacle", label: "Bottom Obstacle" },
];

export const ThemeCreatorModal: React.FC<ThemeCreatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const customThemeColors = useGameStore((s) => s.customThemeColors);
  const setCustomThemeColors = useGameStore((s) => s.setCustomThemeColors);
  const hollowModeEnabled = useGameStore((s) => s.hollowModeEnabled);
  const setHollowModeEnabled = useGameStore((s) => s.setHollowModeEnabled);

  const [draft, setDraft] = useState<ThemeColors>(
    customThemeColors ?? DEFAULT_CUSTOM_COLORS
  );
  const [code, setCode] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    setDraft(customThemeColors ?? DEFAULT_CUSTOM_COLORS);
    setCode("");
    setCodeError("");
    setCopied(false);
  }, [isOpen, customThemeColors]);

  const warnings = useMemo(() => {
    const warn: string[] = [];
    const r1 = contrastRatio(draft.topOrb, draft.topBg);
    const r2 = contrastRatio(draft.bottomOrb, draft.bottomBg);
    const r3 = contrastRatio(draft.accent, draft.topBg);
    const r4 = contrastRatio(draft.accent, draft.bottomBg);
    const min = 3.0; // arcade UI + shapes (non-text) baseline
    if (r1 !== null && r1 < min) warn.push("Top orb ↔ top bg kontrastı düşük.");
    if (r2 !== null && r2 < min)
      warn.push("Bottom orb ↔ bottom bg kontrastı düşük.");
    if (r3 !== null && r3 < min && r4 !== null && r4 < min)
      warn.push("Accent her iki arka planda da zayıf kalıyor.");
    return warn;
  }, [draft]);

  if (!isOpen) return null;

  const setColor = (key: ColorKey, value: string) => {
    const v = value.startsWith("#") ? value : `#${value}`;
    setDraft((d) => ({ ...d, [key]: v }));
  };

  const handleCopy = async () => {
    const next = encodeThemeCode(draft);
    try {
      await navigator.clipboard.writeText(next);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback: just show in input
    }
    setCode(next);
  };

  const handleApplyCode = () => {
    const decoded = decodeThemeCode(code);
    if (!decoded) {
      setCodeError("Kod geçersiz. 'ECHO-...' formatı bekleniyor.");
      return;
    }
    setCodeError("");
    setDraft(decoded);
  };

  const handleSaveEquip = () => {
    setCustomThemeColors(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="relative w-full max-w-md max-h-[92vh] bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-white/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase">
                Echo Studio
              </p>
              <h2 className="text-sm font-bold text-white tracking-wider">
                Theme Creator
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto">
          {/* Preview */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/20">
            <div className="relative h-28">
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${draft.topBg} 0%, ${draft.topBg} 50%, ${draft.bottomBg} 50%, ${draft.bottomBg} 100%)`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 2, height: 52, background: draft.connector }}
              />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2"
                style={{
                  transform: "translate(-50%, -42px)",
                  width: 22,
                  height: 22,
                  borderRadius: 9999,
                  background: hollowModeEnabled ? draft.topBg : draft.topOrb,
                  border: `2px solid ${draft.topOrb}`,
                }}
              />
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2"
                style={{
                  transform: "translate(-50%, 20px)",
                  width: 22,
                  height: 22,
                  borderRadius: 9999,
                  background: hollowModeEnabled ? draft.bottomBg : draft.bottomOrb,
                  border: `2px solid ${draft.bottomOrb}`,
                }}
              />
              <div
                className="absolute right-3 top-3 w-6 h-10 rounded"
                style={{
                  background: hollowModeEnabled ? "transparent" : draft.topObstacle,
                  border: `2px solid ${draft.topObstacle}`,
                }}
              />
              <div
                className="absolute right-3 bottom-3 w-6 h-8 rounded"
                style={{
                  background: hollowModeEnabled ? "transparent" : draft.bottomObstacle,
                  border: `2px solid ${draft.bottomObstacle}`,
                }}
              />
            </div>
            <div className="p-3 flex items-center justify-between border-t border-white/10">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: draft.accent }}
                />
                <span className="text-[10px] text-white/60 tracking-wider uppercase">
                  Live Preview
                </span>
              </div>
              <label className="flex items-center gap-2 text-[10px] text-white/70 tracking-wider uppercase">
                Hollow
                <input
                  type="checkbox"
                  checked={hollowModeEnabled}
                  onChange={(e) => setHollowModeEnabled(e.target.checked)}
                  className="accent-cyan-400"
                />
              </label>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10">
              <p className="text-[10px] text-amber-300 tracking-wider uppercase font-bold">
                Kontrast Uyarısı
              </p>
              <ul className="mt-1 space-y-1">
                {warnings.map((w) => (
                  <li key={w} className="text-xs text-amber-200/80">
                    - {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fields */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="p-3 rounded-xl border border-white/10 bg-white/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-white/50 tracking-wider uppercase">
                    {label}
                  </p>
                  <input
                    type="color"
                    value={draft[key]}
                    onChange={(e) => setColor(key, e.target.value)}
                    className="w-8 h-6 bg-transparent border border-white/10 rounded"
                  />
                </div>
                <input
                  value={draft[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="mt-2 w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 font-mono"
                />
              </div>
            ))}
          </div>

          {/* Code */}
          <div className="mt-4 p-3 rounded-2xl border border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-white/50 tracking-wider uppercase">
                Share Code
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-xs font-bold tracking-wider hover:bg-cyan-500/25 transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? "COPIED" : "COPY"}
              </button>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ECHO-... (paste here)"
              className="mt-2 w-full h-20 bg-black/30 border border-white/10 rounded-xl p-2 text-xs text-white/80 font-mono resize-none"
            />
            {codeError && (
              <p className="mt-2 text-xs text-red-400">{codeError}</p>
            )}
            <button
              onClick={handleApplyCode}
              className="mt-2 w-full py-2 rounded-xl border border-white/15 text-white/80 font-bold text-xs tracking-widest hover:bg-white/5 transition-colors"
            >
              APPLY CODE
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/15 text-white/70 font-bold text-xs tracking-widest hover:bg-white/5 transition-colors"
          >
            KAPAT
          </button>
          <button
            onClick={handleSaveEquip}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-black text-xs tracking-[0.2em] active:scale-[0.98] transition-all shadow-[0_0_25px_rgba(0,240,255,0.25)]"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />
              SAVE
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCreatorModal;


