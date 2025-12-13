# Project Brief — Echo Shift

## Özet

**Echo Shift**, web üzerinde çalışan (PWA) **ritim tabanlı procedural arcade** oyunu. Oyuncu iki zıt orb’u (üst/alt) yönetir; temel mekanik “swap/phase” ve engel geçişi üzerine kurulu. Oyun akışı `App.tsx` tarafından yönetilir, render + simülasyon döngüsü ağırlıkla `components/GameEngine.tsx` içindedir.

## Hedefler

- **Hızlı ve net oynanış**: input gecikmesi düşük, okunabilir görseller.
- **Sistem bazlı genişletilebilirlik**: yeni modlar (Daily Challenge, Campaign, Zen, Ghost Racer) mevcut sisteme entegre edilebilir olmalı.
- **Kalıcı ilerleme**: Echo Shards, shop, upgrade, ayarlar ve bazı progresler localStorage üzerinden saklanır.

## Kapsam / Sınırlar

- Bu repo şu an **React + Canvas** yaklaşımı kullanır (oyun loop’u React render’ı ile değil, requestAnimationFrame ile yürür).
- Backend yok; kalıcılık localStorage + güvenli persist adapter ile sağlanır.

## Başlıca Kod Noktaları

- Oyun “orchestration”: `App.tsx`
- Oyun loop + canvas render: `components/GameEngine.tsx`
- UI katmanı: `components/GameUI.tsx` ve alt bileşenler (Shop, DailyChallenge, Tutorial, Restore, RateUs, Leaderboard)
- Global state: `store/gameStore.ts` (Zustand)
- Persist: `utils/persistence.ts`
- Sistem modülleri: `systems/*`
- Oyun konfigürasyonu: `constants.ts`


