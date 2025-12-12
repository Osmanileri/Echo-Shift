# 🎮 ECHO SHIFT - Detaylı Teknik Dokümantasyon

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Oyun Konsepti ve Mekanikler](#oyun-konsepti-ve-mekanikler)
3. [Gelişmiş Oyun Mekanikleri](#gelişmiş-oyun-mekanikleri)
4. [Dosya Yapısı ve Mimari](#dosya-yapısı-ve-mimari)
5. [Detaylı Dosya Açıklamaları](#detaylı-dosya-açıklamaları)
6. [Oyun Motoru (GameEngine.tsx)](#oyun-motoru-gameenginetsx)
7. [Kullanıcı Arayüzü (GameUI.tsx)](#kullanıcı-arayüzü-gameuitsx)
8. [Matematiksel Hesaplamalar](#matematiksel-hesaplamalar)
9. [Konfigürasyon Sistemi](#konfigürasyon-sistemi)
10. [State Yönetimi](#state-yönetimi)
11. [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)

---

## 🎯 Genel Bakış

**Echo Shift**, React ve Canvas API kullanılarak geliştirilmiş, minimalist tasarıma sahip bir arcade refleks oyunudur. Oyuncu, birbirine bağlı iki zıt renkli topu (beyaz ve siyah) kontrol ederek gelen engellerden kaçınmaya çalışır.

### Temel Özellikler
- 🎨 Siyah-beyaz minimalist tasarım
- ⚡ 60 FPS akıcı oynanış
- 📱 Mobil ve masaüstü uyumlu
- 🔄 Swap (yer değiştirme) mekaniği
- 📈 Dinamik zorluk artışı
- 💾 Yerel skor kaydetme
- 🎵 Ritim Modu (Tempo Focus)
- 🌊 Dinamik Merkez Çizgi
- 👻 Phantom (Görünmez) Engeller
- 🎯 Kritik Vuruş (Close Call) Sistemi

---

## 🕹️ Oyun Konsepti ve Mekanikler

### Ana Konsept
Ekran dikey olarak ikiye bölünmüştür:
- **Üst yarı:** Siyah arka plan
- **Alt yarı:** Beyaz arka plan

Oyuncu, bir çubukla bağlı iki topu kontrol eder:
- **Beyaz top:** Normalde üstte
- **Siyah top:** Normalde altta

### Temel Kurallar

| Kural | Açıklama |
|-------|----------|
| Renk Eşleşmesi | Beyaz top sadece beyaz bloklardan, siyah top sadece siyah bloklardan geçebilir |
| Çarpışma | Yanlış renkli bloğa değen top = Oyun sonu |
| Swap | Topların yerini değiştirerek doğru rengi doğru bloğa hizala |
| Çubuk Uzaması | Skor arttıkça çubuk uzar, hareket alanı daralır |

### Kontrol Şeması

```
┌─────────────────────────────────────┐
│  HAREKET: Ekranı yukarı/aşağı sürükle │
│  SWAP: Ekrana dokun/tıkla            │
│  DURAKLAT: Sağ üst köşe butonu       │
└─────────────────────────────────────┘
```

### Zorluk Dinamikleri

1. **Hız Artışı:** Oyun başlangıçta 25 km/h, maksimum 120 km/h'e çıkar
2. **Çubuk Uzaması:** 60px'den başlar, 160px'e kadar uzar
3. **Spawn Hızı:** Engeller giderek daha sık gelir

---

## 🚀 Gelişmiş Oyun Mekanikleri

### 🎵 1. Ritim Modu (Tempo Focus)

Ardışık engel geçişlerinde ritimli oynayarak bonus puan kazanın!

**Nasıl Çalışır:**
- Engelleri belirli bir ritimde (±200ms tolerans) geçtiğinizde streak sayacı artar
- **3 streak:** x2 puan çarpanı + "RHYTHM!" yazısı
- **6 streak:** x3 puan çarpanı
- Çarpışma veya ritmi kaçırma streak'i sıfırlar

**Konfigürasyon:**
```typescript
RHYTHM_CONFIG = {
  toleranceMs: 200,      // ±200ms tolerans
  streakForX2: 3,        // x2 için gereken streak
  streakForX3: 6,        // x3 için gereken streak
  baseInterval: 800,     // Temel ritim aralığı (ms)
}
```

---

### 🌊 2. Dinamik Merkez Çizgi (Dynamic Midline)

Ufuk çizgisi sinüzoidal hareketle salınır, oyun alanı dinamik olarak değişir!

**Nasıl Çalışır:**
- **500 skor** sonrası aktif olur
- Merkez çizgi yukarı-aşağı salınım yapar
- Skor arttıkça salınım genliği ve hızı artar
- Sınırda (±10px) micro-phasing (kısa dokunulmazlık) aktif olur

**Skor Eşikleri:**
| Skor | Genlik | Açıklama |
|------|--------|----------|
| < 500 | 0% | Sabit merkez çizgi |
| 500-2000 | 3% | Hafif salınım |
| 2000-5000 | 5% | Orta salınım |
| > 5000 | 8% | Maksimum salınım |

**Formül:**
```
Y_midline = (H/2) + (H × amplitude × sin(time × frequency))
```

**Konfigürasyon:**
```typescript
MIDLINE_CONFIG = {
  activationScore: 500,      // Aktivasyon skoru
  baseAmplitude: 0.03,       // Temel genlik (%3)
  maxAmplitude: 0.08,        // Maksimum genlik (%8)
  baseFrequency: 0.0015,     // Temel frekans
  microPhasingDistance: 10,  // Micro-phasing mesafesi (px)
}
```

---

### 👻 3. Phantom Engeller (Görünmez Bloklar)

Bazı engeller saydam başlar ve yaklaştıkça görünür hale gelir!

**Nasıl Çalışır:**
- **500 skor** sonrası phantom engeller spawn olmaya başlar
- Engeller %5 saydamlıkla (hayalet kontur) başlar
- Oyuncuya yaklaştıkça (300px mesafe) tam görünür olur
- **Collision her zaman aktif** - görünmez olsa bile çarpışır!
- Phantom engeli geçmek **+20 bonus puan** kazandırır

**Spawn Olasılığı:**
```
P = min(0.40, 0.10 + 0.30 × (Score - 500) / 4500)
```

| Skor | Olasılık |
|------|----------|
| 500 | %10 |
| 2000 | %20 |
| 5000+ | %40 (max) |

**Opacity Formülü:**
```
α = max(0.05, (X_current - 300) / (X_initial - 300))
```

**Konfigürasyon:**
```typescript
PHANTOM_CONFIG = {
  activationScore: 500,          // Aktivasyon skoru
  revealDistance: 300,           // Tam görünür mesafe (px)
  baseSpawnProbability: 0.10,    // Temel spawn olasılığı
  maxSpawnProbability: 0.40,     // Maksimum spawn olasılığı
  minOpacity: 0.05,              // Minimum saydamlık
  bonusPoints: 20,               // Phantom geçiş bonusu
}
```

---

### 🎯 4. Kritik Vuruş (Close Call / Near Miss)

Engellere yakın geçerek ekstra puan kazanın!

**Nasıl Çalışır:**
- Engele **15px** veya daha yakın geçtiğinizde "Near Miss" sayılır
- Near Miss = **x2 puan** (20 puan yerine 10)
- Ardışık near miss'ler streak oluşturur
- **3 streak:** +25 bonus puan + "PERFECT DODGE!" yazısı

**Görsel Efektler:**
- Cyan parıltı efekti
- Kıvılcım partikülleri
- Floating "+20" popup

**Konfigürasyon:**
```typescript
NEAR_MISS_CONFIG = {
  threshold: 15,              // Yakın geçiş mesafesi (px)
  bonusMultiplier: 2,         // Puan çarpanı
  streakWindow: 4000,         // Streak penceresi (ms)
  streakBonusAt: 3,           // Bonus için gereken streak
  streakBonusPoints: 25,      // Streak bonusu
}
```

---

### 🔗 Mekanik Kombinasyonları

Mekanikler birbirleriyle etkileşir:

| Kombinasyon | Bonus |
|-------------|-------|
| Phantom + Near Miss | 20 × 2 = **40 bonus puan** |
| Rhythm x3 + Normal | 10 × 3 = **30 puan** |
| Rhythm x3 + Near Miss | 20 × 3 = **60 puan** |
| Phantom + Near Miss + Rhythm x3 | (10 + 40) × 3 = **150 puan** |

---

## 📁 Dosya Yapısı ve Mimari

```
echo-shift/
├── 📄 index.html          # HTML giriş noktası
├── 📄 index.tsx           # React uygulama başlatıcı
├── 📄 App.tsx             # Ana uygulama bileşeni, state yönetimi
├── 📄 types.ts            # TypeScript tip tanımları
├── 📄 constants.ts        # Oyun sabitleri ve konfigürasyon
├── 📄 vite.config.ts      # Vite build konfigürasyonu
├── 📄 tsconfig.json       # TypeScript konfigürasyonu
├── 📄 package.json        # Proje bağımlılıkları
│
├── 📁 components/
│   ├── 📄 GameEngine.tsx  # Oyun motoru (render, fizik, collision)
│   └── 📄 GameUI.tsx      # Kullanıcı arayüzü (menüler, HUD)
│
└── 📁 utils/
    ├── 📄 gameMath.ts       # Matematiksel yardımcı fonksiyonlar
    ├── 📄 rhythmSystem.ts   # Ritim modu hesaplamaları
    ├── 📄 midlineSystem.ts  # Dinamik merkez çizgi sistemi
    └── 📄 phantomSystem.ts  # Phantom engel sistemi
```

### Mimari Diyagram

```
┌──────────────────────────────────────────────────────────┐
│                        App.tsx                           │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │   State Mgmt    │    │      Event Handlers         │ │
│  │  - gameState    │    │  - handleStart()            │ │
│  │  - score        │    │  - handlePause()            │ │
│  │  - highScore    │    │  - handleResume()           │ │
│  │  - gameSpeed    │    │  - handleMainMenu()         │ │
│  └────────┬────────┘    │  - handleScoreUpdate()      │ │
│           │             │  - handleGameOver()         │ │
│           ▼             └─────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Props Distribution                     │ │
│  └──────────┬─────────────────────────┬───────────────┘ │
└─────────────┼─────────────────────────┼─────────────────┘
              │                         │
              ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│    GameEngine.tsx       │  │      GameUI.tsx         │
│  ┌───────────────────┐  │  │  ┌───────────────────┐  │
│  │  Canvas Render    │  │  │  │   Menu Screen     │  │
│  │  Game Loop        │  │  │  │   HUD Display     │  │
│  │  Physics          │  │  │  │   Pause Screen    │  │
│  │  Collision        │  │  │  │   Game Over       │  │
│  │  Input Handling   │  │  │  └───────────────────┘  │
│  │  + Rhythm System  │  │  └─────────────────────────┘
│  │  + Midline System │  │
│  │  + Phantom System │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

---

## 📄 Detaylı Dosya Açıklamaları

### 1. index.html
```html
<!-- Uygulama kök elementi -->
<div id="root"></div>
```
- Vite tarafından işlenen HTML şablonu
- React uygulamasının mount edileceği `root` div'i içerir

### 2. index.tsx
```typescript
// React uygulamasını başlatır
ReactDOM.createRoot(rootElement).render(<App />);
```
**Görevleri:**
- Root DOM elementini bulur
- React uygulamasını StrictMode ile başlatır
- App bileşenini render eder

### 3. types.ts - Tip Tanımları

```typescript
// Oyun durumları
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

// Obstacle interface (Phantom desteği ile)
export interface Obstacle {
  id: string;
  x: number;
  y: number;
  targetY: number;
  width: number;
  height: number;
  lane: 'top' | 'bottom';
  polarity: 'white' | 'black';
  passed: boolean;
  isLatent?: boolean;      // Phantom engel mi?
  revealDistance?: number; // Tam görünür mesafe
  initialX?: number;       // Başlangıç X pozisyonu
}

// Ritim sistemi state
export interface RhythmState {
  lastPassTime: number;
  expectedInterval: number;
  streakCount: number;
  activeMultiplier: number;
  isRhythmActive: boolean;
}

// Midline sistemi state
export interface MidlineState {
  startTime: number;
  currentMidlineY: number;
  normalizedOffset: number;
  currentAmplitude: number;
  currentFrequency: number;
  isAtPeak: boolean;
  isMicroPhasing: boolean;
  tensionIntensity: number;
}
```

### 4. constants.ts - Oyun Sabitleri

```typescript
export const COLORS = {
  TOP_BG: '#000000',
  BOTTOM_BG: '#FFFFFF',
  TOP_ORB: '#FFFFFF',
  BOTTOM_ORB: '#000000',
  CONNECTOR: '#888888',
  ACCENT_CYAN: '#00F0FF',
  ACCENT_RED: '#FF2A2A',
};

export const INITIAL_CONFIG = {
  baseSpeed: 2.5,
  maxSpeed: 12,
  spawnRate: 140,
  minSpawnRate: 50,
  orbRadius: 9,
  connectorWidth: 3,
  obstacleWidth: 32,
  minConnectorLength: 60,
  maxConnectorLength: 160,
  connectorGrowthRate: 0.08,
  swapCooldown: 150,
  swapDuration: 150,
  uiSafeArea: 100,
  bottomMargin: 50,
};
```

---

## 🎮 Oyun Motoru (GameEngine.tsx)

GameEngine, oyunun kalbidir. Canvas API kullanarak tüm render, fizik ve collision işlemlerini yönetir.

### Bileşen Props

```typescript
interface GameEngineProps {
  gameState: GameState;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  setGameSpeedDisplay: (speed: number) => void;
}
```

### Entegre Sistemler

1. **Rhythm System:** Engel geçişlerinde ritim kontrolü
2. **Midline System:** Dinamik merkez çizgi hesaplaması
3. **Phantom System:** Görünmez engel opacity hesaplaması
4. **Near Miss System:** Yakın geçiş tespiti ve bonus

### Ana Oyun Döngüsü

```typescript
const loop = () => {
  // 1. Midline pozisyonunu güncelle
  const midlineY = calculateMidlineY(height, elapsedTime, config, score);
  
  // 2. Engelleri hareket ettir ve phantom opacity hesapla
  obstacles.forEach(obs => {
    obs.x -= speed;
    if (obs.isLatent) {
      obs.opacity = calculatePhantomOpacity(obs.x, obs.initialX, obs.revealDistance);
    }
  });
  
  // 3. Collision detection (micro-phasing kontrolü ile)
  // 4. Near miss kontrolü
  // 5. Rhythm timing kontrolü
  // 6. Render
  
  frameId = requestAnimationFrame(loop);
};
```

---

## 🖥️ Kullanıcı Arayüzü (GameUI.tsx)

### HUD Elementleri

| Element | Konum | Açıklama |
|---------|-------|----------|
| Skor | Sol üst | 5 haneli, sıfır dolgulu |
| Hız | Sağ üst | km/h formatında |
| Rhythm Multiplier | Üst orta | x2/x3 göstergesi |
| Near Miss Streak | Sağ alt | Combo sayacı |
| Duraklat | Sağ üst | Pause ikonu |

---

## 🔢 Matematiksel Hesaplamalar

### utils/gameMath.ts
- `checkCollision()` - Daire-dikdörtgen çarpışma tespiti
- `checkNearMiss()` - Yakın geçiş mesafe hesabı
- `randomRange()` - Rastgele sayı üreteci

### utils/rhythmSystem.ts
- `calculateExpectedInterval()` - Beklenen ritim aralığı
- `checkRhythmTiming()` - Ritim kontrolü
- `getMultiplierForStreak()` - Streak'e göre çarpan
- `updateRhythmState()` - State güncelleme

### utils/midlineSystem.ts
- `calculateMidlineY()` - Anlık midline pozisyonu
- `calculateDynamicFrequency()` - Skora göre frekans
- `calculateDynamicAmplitude()` - Skora göre genlik
- `getOrbZone()` - Orb'un hangi bölgede olduğu
- `shouldApplyMicroPhasing()` - Micro-phasing kontrolü

### utils/phantomSystem.ts
- `calculatePhantomOpacity()` - Engel saydamlığı
- `getEffectiveOpacity()` - Minimum opacity eşiği
- `calculatePhantomSpawnProbability()` - Spawn olasılığı
- `shouldSpawnAsPhantom()` - Phantom spawn kararı
- `calculatePhantomBonus()` - Bonus puan hesabı

---

## ⚙️ Konfigürasyon Sistemi

### Tüm Konfigürasyonlar

| Sistem | Dosya | Sabit |
|--------|-------|-------|
| Temel Oyun | constants.ts | `INITIAL_CONFIG` |
| Ritim | constants.ts | `RHYTHM_CONFIG` |
| Gravite | constants.ts | `GRAVITY_CONFIG` |
| Near Miss | constants.ts | `NEAR_MISS_CONFIG` |
| Midline | constants.ts | `MIDLINE_CONFIG` |
| Phantom | constants.ts | `PHANTOM_CONFIG` |

---

## 🔄 State Yönetimi (App.tsx)

### State Akış Diyagramı

```
┌─────────────────────────────────────────────────────────────┐
│                     STATE AKIŞ DİYAGRAMI                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                        ┌──────────┐                        │
│                        │   MENU   │                        │
│                        └────┬─────┘                        │
│                             │ handleStart()                │
│                             ▼                              │
│                        ┌──────────┐                        │
│              ┌────────►│ PLAYING  │◄────────┐              │
│              │         └────┬─────┘         │              │
│              │              │               │              │
│   handleResume()    handlePause()   handleRestart()        │
│              │              │               │              │
│              │              ▼               │              │
│              │         ┌──────────┐         │              │
│              └─────────│  PAUSED  │─────────┘              │
│                        └────┬─────┘                        │
│                             │ handleMainMenu()             │
│                             ▼                              │
│                        ┌──────────┐                        │
│                        │   MENU   │                        │
│                        └──────────┘                        │
│                                                             │
│                        ┌──────────┐                        │
│                        │ PLAYING  │                        │
│                        └────┬─────┘                        │
│                             │ handleGameOver()             │
│                             ▼                              │
│                        ┌──────────┐                        │
│                        │GAME_OVER │                        │
│                        └──────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- npm veya yarn

### Kurulum Adımları

```bash
# 1. Projeyi klonla
git clone <repo-url>
cd echo-shift

# 2. Bağımlılıkları yükle
npm install

# 3. Geliştirme sunucusunu başlat
npm run dev

# 4. Tarayıcıda aç
# http://localhost:3000
```

### Build Komutları

| Komut | Açıklama |
|-------|----------|
| `npm run dev` | Geliştirme sunucusu (hot reload) |
| `npm run build` | Production build |
| `npm run preview` | Build önizleme |
| `npm test` | Testleri çalıştır |

### Bağımlılıklar

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^6.x",
    "@types/react": "^18.x",
    "tailwindcss": "^3.x",
    "vitest": "^3.x",
    "fast-check": "^3.x"
  }
}
```

---

## 🎨 Renk Paleti

| Renk | Hex | Kullanım |
|------|-----|----------|
| Siyah | `#000000` | Üst arka plan, siyah top, siyah blok |
| Beyaz | `#FFFFFF` | Alt arka plan, beyaz top, beyaz blok |
| Gri | `#888888` | Çubuk (connector) |
| Cyan | `#00F0FF` | Vurgu, swap efekti, near miss, rhythm |
| Kırmızı | `#FF2A2A` | Hata, game over |

---

## 📱 Responsive Tasarım

- Canvas tam ekran (`100vw x 100vh`)
- Touch ve mouse desteği
- UI elementleri mobil için optimize
- Font boyutları responsive (`text-xs md:text-sm`)

---

## 🧪 Test Stratejisi

Proje **property-based testing** yaklaşımı kullanır:

```typescript
// Örnek: Phantom opacity testi
test('opacity formula returns correct value', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 800 }),
      fc.integer({ min: 800, max: 1200 }),
      (currentX, initialX) => {
        const opacity = calculatePhantomOpacity(currentX, initialX, 300);
        return opacity >= 0 && opacity <= 1;
      }
    )
  );
});
```

Test dosyaları:
- `utils/midlineSystem.test.ts`
- `utils/phantomSystem.test.ts`

---

## 📄 Lisans

MIT License

---

**Echo Shift** - Siyah ve beyaz arasında denge kur! 🎮⚫⚪
