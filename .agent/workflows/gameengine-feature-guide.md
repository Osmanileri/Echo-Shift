---
description: GameEngine'e yeni özellik ekleme kuralları
---
# GameEngine Kod Ekleme Kuralları

## 🔴 ÖNEMLİ: GameEngine.tsx'e Doğrudan Kod EKLEME!

Bu dosya ~6800 satır. Daha fazla büyümemeli!

## Yeni Özellik Ekleme Adımları

1. **Yeni sistem dosyası oluştur:**
   ```
   systems/newFeatureSystem.ts
   ```

2. **Mantığı ayrı dosyada yaz:**
   - State interface'leri
   - Update fonksiyonları  
   - Render fonksiyonları

3. **GameEngine'de SADECE:**
   - Import statement (1 satır)
   - useRef tanımı (1 satır)
   - Fonksiyon çağrısı (1 satır)

## Örnek: Doğru Yaklaşım

```typescript
// systems/myNewSystem.ts
export function createState() { ... }
export function update(state) { ... }
export function render(ctx, state) { ... }

// GameEngine.tsx - SADECE bu kadar ekle!
import * as MyNewSystem from '../systems/myNewSystem';
const myState = useRef(MyNewSystem.createState());
// loop içinde:
myState.current = MyNewSystem.update(myState.current);
MyNewSystem.render(ctx, myState.current);
```

## Klasör Yapısı

| Tür | Konum |
|-----|-------|
| Oyun sistemleri | `systems/` |
| Yardımcı util'ler | `utils/` |
| UI bileşenleri | `components/` |
| Veri dosyaları | `data/` |
