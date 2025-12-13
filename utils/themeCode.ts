import type { ThemeColors } from "../data/themes";

/**
 * V1: Eski tam tema formatı (geriye uyumluluk için)
 * V2: Sadeleştirilmiş format (sadece topBg ve bottomBg)
 */
export interface ThemeCodePayloadV1 {
  v: 1;
  c: ThemeColors;
}

export interface ThemeCodePayloadV2 {
  v: 2;
  t: string; // topBg
  b: string; // bottomBg
}

/**
 * Tema renk türetme fonksiyonu
 */
const deriveFullTheme = (topBg: string, bottomBg: string): ThemeColors => ({
  topBg,
  bottomBg,
  topOrb: bottomBg,
  bottomOrb: topBg,
  connector: '#888888',
  accent: '#00F0FF',
  accentSecondary: '#FF2A2A',
  topObstacle: bottomBg,
  bottomObstacle: topBg,
});

function toBase64Url(input: string): string {
  const base64 =
    typeof btoa === "function"
      ? btoa(input)
      : Buffer.from(input, "utf8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "===".slice((base64.length + 3) % 4);
  return typeof atob === "function"
    ? atob(padded)
    : Buffer.from(padded, "base64").toString("utf8");
}

export function encodeThemeCode(colors: ThemeColors): string {
  // V2: Sadece topBg ve bottomBg kaydet (daha kısa kod)
  const payload: ThemeCodePayloadV2 = { v: 2, t: colors.topBg, b: colors.bottomBg };
  const json = JSON.stringify(payload);
  return `ECHO-${toBase64Url(json)}`;
}

export function decodeThemeCode(code: string): ThemeColors | null {
  const trimmed = code.trim();
  const raw = trimmed.startsWith("ECHO-") ? trimmed.slice(5) : trimmed;
  try {
    const json = fromBase64Url(raw);
    const parsed = JSON.parse(json) as { v?: number };
    
    if (parsed?.v === 2) {
      // V2: Sadece topBg ve bottomBg'den tüm temayı türet
      const v2 = parsed as ThemeCodePayloadV2;
      if (!v2.t || !v2.b) return null;
      return deriveFullTheme(v2.t, v2.b);
    } else if (parsed?.v === 1) {
      // V1: Geriye uyumluluk - eski tam tema formatı
      const v1 = parsed as ThemeCodePayloadV1;
      if (!v1.c) return null;
      // Eski formatı yeni mantıkla türet (topBg ve bottomBg'yi kullan)
      return deriveFullTheme(v1.c.topBg, v1.c.bottomBg);
    }
    return null;
  } catch {
    return null;
  }
}
