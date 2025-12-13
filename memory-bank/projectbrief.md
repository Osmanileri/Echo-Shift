# Project Brief — Echo Shift

## Özet

**Echo Shift**, web üzerinde çalışan (PWA) **ritim tabanlı procedural arcade** oyunu. Oyuncu iki zıt orb'u (üst/alt) yönetir; temel mekanik "swap/phase" ve engel geçişi üzerine kurulu. Oyun akışı `App.tsx` tarafından yönetilir, render + simülasyon döngüsü ağırlıkla `components/GameEngine.tsx` içindedir.

## Hedefler

- **Hızlı ve net oynanış**: input gecikmesi düşük, okunabilir görseller.
- **Sistem bazlı genişletilebilirlik**: yeni modlar (Daily Challenge, Campaign, Zen, Ghost Racer) mevcut sisteme entegre edilebilir olmalı.
- **Kalıcı ilerleme**: Echo Shards, shop, upgrade, ayarlar ve bazı progresler localStorage üzerinden saklanır.

## Kapsam / Sınırlar

- Bu repo şu an **React + Canvas** yaklaşımı kullanır (oyun loop'u React render'ı ile değil, requestAnimationFrame ile yürür).
- Backend yok; kalıcılık localStorage + güvenli persist adapter ile sağlanır.

## Başlıca Kod Noktaları

| Dosya/Klasör | Açıklama |
|--------------|----------|
| `App.tsx` | Oyun orchestration, state machine |
| `components/GameEngine.tsx` | Oyun loop + canvas render |
| `components/GameUI.tsx` | Ana UI katmanı |
| `store/gameStore.ts` | Zustand global state |
| `utils/persistence.ts` | Storage adapter + key'ler |
| `systems/` | Oyun sistemleri (constructs, audio, patterns, etc.) |
| `data/` | Oyun verileri (patterns, themes, skins, etc.) |
| `constants.ts` | Gameplay config |

## Tamamlanan Özellikler

### Echo Constructs ✅
- Titan, Phase, Blink formları
- GlitchToken spawn sistemi
- Second Chance + Smart Bomb
- VFX ve audio entegrasyonu

### Procedural Gameplay ✅
- Logaritmik hız eğrisi (Flow Curve)
- Pattern-based engel sistemi
- Zorluk progresyonu
- Akıllı elmas yerleşimi

### Engagement ✅
- Harmonic Resonance (Fever Mode)
- System Restore (Revive)
- Daily Rituals
- Haptic Feedback
- Analytics

### Professionalization ✅
- Echo Shards ekonomisi
- Shop (Skins, Themes, Upgrades)
- Campaign Mode (100 seviye)
- Daily Challenge
- Ghost Racer
- Leaderboard
- PWA desteği

### Advanced Mechanics ✅
- Near Miss sistemi
- Rhythm Mode
- Gravity Flip
- Dynamic Midline
- Phantom Obstacles

### S.H.I.F.T. Protocol ✅
- Harf toplama sistemi
- Overdrive Mode
- Magnet efekti
