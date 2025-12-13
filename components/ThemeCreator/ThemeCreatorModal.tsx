import { AlertTriangle, Copy, Palette, Save, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { ThemeColors } from "../../data/themes";
import { useGameStore } from "../../store/gameStore";
import { contrastRatio } from "../../utils/colorContrast";
import { decodeThemeCode, encodeThemeCode } from "../../utils/themeCode";

interface ThemeCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Sadeleştirilmiş Tema Sistemi:
 * - Kullanıcı sadece TOP BG ve BOTTOM BG seçer
 * - Diğer tüm renkler otomatik türetilir:
 *   - topOrb = bottomBg (zıt arka plana karşı görünür)
 *   - bottomOrb = topBg (zıt arka plana karşı görünür)
 *   - topObstacle = bottomBg (orb ile aynı)
 *   - bottomObstacle = topBg (orb ile aynı)
 *   - connector = gri
 *   - accent = cyan
 *   - accentSecondary = kırmızı
 */
const deriveFullTheme = (topBg: string, bottomBg: string): ThemeColors => ({
  topBg,
  bottomBg,
  topOrb: bottomBg,      // Üst top = alt arka plan rengi (zıt)
  bottomOrb: topBg,      // Alt top = üst arka plan rengi (zıt)
  connector: "#888888",
  accent: "#00F0FF",
  accentSecondary: "#FF2A2A",
  topObstacle: bottomBg, // Üst engel = üst orb ile aynı
  bottomObstacle: topBg, // Alt engel = alt orb ile aynı
});

const DEFAULT_CUSTOM_COLORS: ThemeColors = deriveFullTheme("#000000", "#FFFFFF");

type EditableColorKey = "topBg" | "bottomBg";

const COLOR_FIELDS: Array<{ key: EditableColorKey; label: string }> = [
  { key: "topBg", label: "Üst Alan" },
  { key: "bottomBg", label: "Alt Alan" },
];

export const ThemeCreatorModal: React.FC<ThemeCreatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const customThemeColors = useGameStore((s) => s.customThemeColors);
  const setCustomThemeColors = useGameStore((s) => s.setCustomThemeColors);

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
    // İki arka plan rengi birbirine çok benziyorsa uyar
    const bgContrast = contrastRatio(draft.topBg, draft.bottomBg);
    const min = 2.5; // İki alan arasında minimum kontrast
    if (bgContrast !== null && bgContrast < min) {
      warn.push("Üst ve alt alan renkleri birbirine çok yakın. Daha zıt renkler seçin.");
    }
    return warn;
  }, [draft]);

  if (!isOpen) return null;

  const setColor = (key: EditableColorKey, value: string) => {
    const v = value.startsWith("#") ? value : `#${value}`;
    // Sadece topBg veya bottomBg değiştiğinde tüm temayı yeniden türet
    setDraft((d) => {
      const newTopBg = key === "topBg" ? v : d.topBg;
      const newBottomBg = key === "bottomBg" ? v : d.bottomBg;
      return deriveFullTheme(newTopBg, newBottomBg);
    });
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-900 to-black sm:rounded-2xl rounded-t-2xl border-t sm:border border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Palette className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] text-white/50 tracking-[0.25em] uppercase">
                Customize
              </p>
              <h2 className="text-sm font-bold text-white tracking-wider">
                ECHO STUDIO
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
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Live Preview Card */}
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40 shadow-2xl relative group">
            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-black/50 backdrop-blur text-[10px] text-white/50 uppercase tracking-wider font-bold">
              Preview
            </div>
            <div className="relative h-40">
              {/* Backgrounds */}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${draft.topBg} 0%, ${draft.topBg} 50%, ${draft.bottomBg} 50%, ${draft.bottomBg} 100%)`,
                }}
              />

              {/* Center Connector */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ width: 2, height: 80, background: draft.connector }}
              />

              {/* Top Orb - üst alanda olduğu için solid (farklı renk) */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-300"
                style={{
                  transform: "translate(-50%, -50px)",
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: draft.topOrb,
                  boxShadow: `0 0 15px ${draft.topOrb}40`,
                }}
              />

              {/* Bottom Orb - alt alanda olduğu için solid (farklı renk) */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 transition-all duration-300"
                style={{
                  transform: "translate(-50%, 22px)",
                  width: 28,
                  height: 28,
                  borderRadius: 9999,
                  background: draft.bottomOrb,
                  boxShadow: `0 0 15px ${draft.bottomOrb}40`,
                }}
              />

              {/* Obstacles */}
              <div
                className="absolute right-8 top-6 w-8 h-12 rounded-sm"
                style={{
                  background: draft.topObstacle,
                  border: `2px solid ${draft.topObstacle}`,
                }}
              />
              <div
                className="absolute right-8 bottom-6 w-8 h-10 rounded-sm"
                style={{
                  background: draft.bottomObstacle,
                  border: `2px solid ${draft.bottomObstacle}`,
                }}
              />
            </div>

            {/* Accent Color Indicator */}
            <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
                  style={{ color: draft.accent, backgroundColor: draft.accent }}
                />
                <span className="text-[10px] text-white/60 tracking-wider uppercase font-medium">
                  Accent Color
                </span>
              </div>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] text-amber-200 font-bold tracking-wide uppercase mb-1">
                  Görünürlük Sorunu
                </p>
                <ul className="space-y-1">
                  {warnings.map((w) => (
                    <li key={w} className="text-[10px] text-amber-200/70">
                      • {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Color Pickers */}
          <div className="grid grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label }) => (
              <div
                key={key}
                className="group p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] text-white/40 tracking-wider uppercase font-medium group-hover:text-white/60 transition-colors">
                    {label}
                  </p>
                  <div className="relative w-6 h-6 rounded-full overflow-hidden border border-white/20 shadow-sm">
                    <input
                      type="color"
                      value={draft[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                    />
                  </div>
                </div>
                <input
                  value={draft[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="w-full bg-black/20 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-white/60 font-mono focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Share Section */}
          <div className="p-4 rounded-2xl border border-white/10 bg-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-white/40" />
                <p className="text-[10px] text-white/40 tracking-wider uppercase font-bold">
                  Share Theme
                </p>
              </div>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold tracking-wider hover:bg-cyan-500/20 transition-colors"
              >
                {copied ? "COPIED!" : "COPY CODE"}
              </button>
            </div>

            <div className="relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste theme code (ECHO-...)"
                className="w-full h-20 bg-black/30 border border-white/10 rounded-xl p-3 text-[10px] text-white/70 font-mono resize-none focus:outline-none focus:border-cyan-500/30 transition-colors placeholder:text-white/20"
              />
              <div className="absolute bottom-2 right-2">
                <button
                  onClick={handleApplyCode}
                  className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white/80 text-[10px] font-bold tracking-wider hover:bg-white/20 transition-colors"
                >
                  APPLY
                </button>
              </div>
            </div>

            {codeError && (
              <p className="text-[10px] text-red-400 font-medium pl-1">
                {codeError}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-white/10 text-white/60 font-bold text-xs tracking-widest hover:bg-white/5 transition-colors uppercase"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSaveEquip}
            className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-black text-xs tracking-[0.2em] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] uppercase flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Kaydet & Kullan
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeCreatorModal;
