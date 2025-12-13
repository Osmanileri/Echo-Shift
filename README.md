# Echo Shift 🎮

Ritim tabanlı procedural arcade oyunu. İki zıt orb'u yönet, engelleri geç, yüksek skor kovala!

## 🚀 Başlangıç

```bash
npm install
npm run dev
```

## 🎯 Oynanış

- **Temel Mekanik**: Ekrana dokun/tıkla → orblar yer değiştirir
- **Hedef**: Doğru renkli orb ile aynı renkli engelden geç
- **Skor**: Engel geçişi = puan, streak = çarpan bonus

## ✨ Özellikler

### 🔮 Echo Constructs
- **Glitch Token**: 500+ skorda %3 şansla belirir
- **Titan**: Ağır yerçekimi, stomp ile engel patlatma
- **Phase**: Yerçekimi ters çevirme, tavan/zemin geçişi
- **Blink**: Teleport mekaniği
- **Second Chance**: Construct formunda ölmezsin, Smart Bomb patlar

### 🎵 Ritim & Streak
- **Harmonic Resonance**: 10 streak → 10 saniye god mode
- **Near Miss**: Engele yakın geç → bonus puan
- **Rhythm Multiplier**: Zamanlamalı geçişler → x2, x3 çarpan

### 🛒 Meta Sistemler
- **Echo Shards**: Skorun %10'u kadar para
- **Shop**: Skin, tema, upgrade satın al
- **Campaign**: 100 seviye
- **Daily Challenge**: Günlük özel challenge
- **Ghost Racer**: Önceki rekorunla yarış

### ⚡ S.H.I.F.T. Protocol
- 5 harf topla → Overdrive mode (10 saniye invincibility)

### 🔄 System Restore
- Öldüğünde 100 Echo Shard ile 3 saniye geri sar

## 🛠️ Teknolojiler

- **Frontend**: React 18 + TypeScript
- **Build**: Vite 5
- **State**: Zustand
- **Test**: Vitest (364 test)
- **PWA**: vite-plugin-pwa
- **Audio**: Web Audio API (procedural)

## 📁 Proje Yapısı

```
├── components/          # React bileşenleri
│   ├── GameEngine.tsx   # Oyun loop + canvas render
│   ├── GameUI.tsx       # Ana UI
│   └── ...              # Shop, Campaign, Tutorial, etc.
├── systems/             # Oyun sistemleri
│   ├── constructs/      # Echo Constructs sistemi
│   ├── audioSystem.ts   # Ses efektleri
│   └── ...              # Diğer sistemler
├── store/               # Zustand state
├── data/                # Oyun verileri (patterns, themes, etc.)
├── utils/               # Yardımcı fonksiyonlar
└── .kiro/specs/         # Özellik spesifikasyonları
```

## 🧪 Test

```bash
npm run test        # Vitest watch mode
npx vitest run      # Tek seferlik çalıştır
```

## 📱 PWA

Oyun PWA olarak çalışır - mobilde "Ana Ekrana Ekle" ile uygulama gibi kullanılabilir.

## 📄 Lisans

MIT
