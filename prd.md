# Echo Shift - Product Requirements Document

## Genel Bakış

Echo Shift, web tabanlı (PWA) ritim odaklı procedural arcade oyunudur. Oyuncu iki zıt orb'u (siyah/beyaz) yönetir ve engelleri geçerek skor toplar.

## Hedef Kitle

- Casual arcade oyuncuları
- Ritim oyunu severler
- Mobil web oyuncuları

## Temel Mekanikler

### 1. Dual-Orb Swap
- İki orb (üst/alt) bağlı hareket eder
- Ekrana dokunma/tıklama ile yer değiştirir
- Doğru renkli orb, aynı renkli engelden geçmeli

### 2. Engel Sistemi
- Pattern-based spawn (Gate, Zig-Zag, Tunnel, Gauntlet, Breather)
- Zorluk progresyonu (skor bazlı)
- Phantom engeller (görünmez başlar, yaklaştıkça belirir)

### 3. Hız Sistemi
- Logaritmik hız artışı (30-140 km/h)
- Warm-up → Groove → Plateau fazları

## Özellikler

### Echo Constructs
| Construct | Mekanik | Tetikleyici |
|-----------|---------|-------------|
| Titan | 2.5x yerçekimi, stomp ile engel patlatma | Glitch Token |
| Phase | Yerçekimi flip, tavan/zemin geçişi | Glitch Token |
| Blink | Teleport, ghost projection | Glitch Token |

### Engagement Sistemleri
| Sistem | Açıklama |
|--------|----------|
| Harmonic Resonance | 10 streak → 10s god mode |
| System Restore | 100 shard ile 3s geri sarma |
| Daily Rituals | Günlük 3 görev |
| Near Miss | Yakın geçiş bonusu |

### Meta Sistemler
| Sistem | Açıklama |
|--------|----------|
| Echo Shards | Skor %10 para birimi |
| Shop | Skin, tema, upgrade |
| Campaign | 100 seviye |
| Daily Challenge | Günlük challenge |
| Ghost Racer | Rekor yarışı |
| Leaderboard | Top 100 skor |

### S.H.I.F.T. Protocol
- 5 harf topla → Overdrive mode
- 10 saniye invincibility
- Engel patlatma
- Magnet efekti (150px)

## Teknik Gereksinimler

### Performans
- 60 FPS hedef
- Input gecikmesi < 16ms
- PWA offline desteği

### Kalıcılık
- localStorage ile state persist
- Memory fallback (localStorage yoksa)
- Güvenli JSON serialize/deserialize

### Test
- 364+ unit/property test
- Vitest framework
- fast-check (property-based testing)

## Storage Keys

Tüm storage key'leri `echo-shift-` prefix'i ile standardize edilmiştir:

```
echo-shift-game-state    # Ana oyun state'i
echo-shift-echo-shards   # Para birimi
echo-shift-inventory     # Envanter
echo-shift-equipped      # Donanmış itemler
echo-shift-campaign      # Campaign ilerlemesi
echo-shift-settings      # Ayarlar
echo-shift-ghost         # Ghost racer verisi
echo-shift-daily         # Daily challenge
echo-shift-leaderboard   # Skor tablosu
```

## Dosya Yapısı

```
components/
├── GameEngine.tsx       # Oyun loop + canvas
├── GameUI.tsx           # Ana UI
├── Campaign/            # Campaign modu
├── DailyChallenge/      # Günlük challenge
├── Leaderboard/         # Skor tablosu
├── RateUs/              # Değerlendirme prompt
├── Restore/             # System Restore UI
├── Rituals/             # Daily Rituals
├── Shop/                # Mağaza
├── ThemeCreator/        # Tema oluşturucu
├── Tutorial/            # Tutorial
└── Zones/               # Zone seçici

systems/
├── constructs/          # Echo Constructs
│   ├── ConstructSystem.ts
│   ├── TitanPhysics.ts
│   ├── PhasePhysics.ts
│   ├── BlinkPhysics.ts
│   └── ...
├── audioSystem.ts       # Web Audio API SFX
├── flowCurve.ts         # Hız eğrisi
├── patternManager.ts    # Pattern spawn
├── difficultyProgression.ts
├── shardPlacement.ts    # Elmas yerleşimi
├── objectPool.ts        # Object pooling
├── resonanceSystem.ts   # Harmonic Resonance
├── restoreSystem.ts     # System Restore
├── shiftProtocol.ts     # S.H.I.F.T.
└── ...

store/
└── gameStore.ts         # Zustand state

data/
├── patterns.ts          # Engel desenleri
├── themes.ts            # Temalar
├── skins.ts             # Ball skinleri
├── upgrades.ts          # Yükseltmeler
├── levels.ts            # Campaign seviyeleri
├── rituals.ts           # Daily rituals
└── zones.ts             # Frekans zone'ları
```

## Tamamlanan Spec'ler

1. ✅ **echo-constructs** - Titan/Phase/Blink, GlitchToken, Second Chance
2. ✅ **procedural-gameplay** - Flow Curve, Pattern System, Difficulty
3. ✅ **echo-shift-professionalization** - Shop, Campaign, Ghost Racer, PWA
4. ✅ **echo-shift-engagement** - Resonance, Restore, Rituals, Haptics
5. ✅ **echo-shift-v2-mechanics** - S.H.I.F.T. Protocol
6. ✅ **advanced-game-mechanics** - Near Miss, Rhythm, Gravity, Phantom
7. ✅ **ios-cloud-deployment** - GitHub Actions, Fastlane, TestFlight

---

## 📱 iOS Cloud Deployment (Memory Bank)

> **Son Güncelleme:** 22 Aralık 2025 | **Build:** 22 (1.0) | **Durum:** ✅ TestFlight'ta

### Kritik Dosyalar

| Dosya | Açıklama |
|-------|----------|
| `.github/workflows/deploy-ios.yml` | GitHub Actions workflow |
| `fastlane/Fastfile` | Derleme ve yükleme mantığı |
| `Gemfile` | Fastlane sürüm kilidi (>= 2.226.1) |
| `ios/App/App.xcodeproj` | Xcode proje dosyası |
| `capacitor.config.ts` | Capacitor ayarları |

### GitHub Secrets

| Secret | Nereden Alınır |
|--------|----------------|
| `ASC_KEY_ID` | App Store Connect > Users > Keys |
| `ASC_ISSUER_ID` | App Store Connect > Users > Keys |
| `ASC_KEY_CONTENT` | İndirilen `.p8` dosyası içeriği |
| `APPLE_TEAM_ID` | Developer Portal > Membership |

### CI/CD Akışı

```
git push main → GitHub Actions → npm build → cap sync → Fastlane
    ↓
[Fastfile]
1. create_keychain (ci_keychain-db)
2. app_store_connect_api_key
3. update_code_signing_settings (Manual, Apple Distribution)
4. cert (sertifika indir/oluştur)
5. sigh (profil indir/oluştur)
6. build_app (.ipa oluştur)
7. upload_to_testflight
    ↓
✅ TestFlight'ta Hazır!
```

### Sık Karşılaşılan Hatalar

| Hata | Çözüm |
|------|-------|
| "Max Distribution certificates" | Developer Portal > Certificates > Tümünü sil |
| "Keychain not found" | Yol sonuna `-db` ekle: `ci_keychain-db` |
| "iOS Development not found" | `CODE_SIGN_IDENTITY='Apple Distribution'` zorla |
| "Profile not matching" | `SIGH_NAME` dinamik kullan |
| Build takılıyor | `create_keychain(unlock: true)` kullan |
| "Missing Compliance" | "None of the algorithms" seç |

### TestFlight Tester Ekleme

1. App Store Connect > TestFlight
2. "INTERNAL TESTING" yanındaki ➕ tıkla
3. Grup oluştur, email ekle
4. iPhone'da TestFlight'tan indir

### Gelecekte Yapılacaklar

- [ ] Uygulama ikonu ekle (1024x1024)
- [ ] Launch screen tasarla
- [ ] App Store açıklaması hazırla
- [ ] Ekran görüntüleri oluştur
- [ ] Public release için App Store Review'a gönder

### Acil Durum Checklist

1. ✅ GitHub Secrets doğru mu?
2. ✅ Sertifika limiti doldu mu? (Portal'dan sil)
3. ✅ Bundle ID: `com.osmanileri.echoshift`
4. ✅ Node.js v22, Fastlane >= 2.226.1
