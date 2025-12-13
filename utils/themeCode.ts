import type { ThemeColors } from "../data/themes";

export interface ThemeCodePayloadV1 {
  v: 1;
  c: ThemeColors;
}

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
  const payload: ThemeCodePayloadV1 = { v: 1, c: colors };
  const json = JSON.stringify(payload);
  return `ECHO-${toBase64Url(json)}`;
}

export function decodeThemeCode(code: string): ThemeColors | null {
  const trimmed = code.trim();
  const raw = trimmed.startsWith("ECHO-") ? trimmed.slice(5) : trimmed;
  try {
    const json = fromBase64Url(raw);
    const parsed = JSON.parse(json) as Partial<ThemeCodePayloadV1>;
    if (parsed?.v !== 1) return null;
    if (!parsed.c) return null;
    return parsed.c as ThemeColors;
  } catch {
    return null;
  }
}


