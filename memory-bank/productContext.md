# Product Context — Neden var, nasıl hissettirmeli?

> [!IMPORTANT]
> **PLATFORM: MOBILE ONLY**
> Bu proje **sadece** mobil platformlar (iOS/Android PWA) için tasarlanmıştır. Tüm geliştirmeler, UI ölçeklendirmeleri ve kontroller mobil ekranlar baz alınarak yapılmalıdır. Responsive web tasarımı ikinci plandadır.


## Problem / İhtiyaç

- Kısa süreli oturumlarda bile "flow" yakalatan, hızlı öğrenilen ama ustalaşması zor bir arcade deneyimi.
- Günlük tekrar oynanabilirlik (Daily Challenge), hedef/ilerleme (Campaign), rahat mod (Zen) gibi katmanlarla oyuncuyu geri çağırmak.

## Kullanıcı Deneyimi Hedefleri

- **Okunabilirlik**: üst/alt kontrastı, engel polaritesi, midline hareketi oyuncu tarafından hızlı algılanabilmeli.
- **Ritim ödülü**: streak ve multiplier sistemi görsel/puan olarak net geri bildirim vermeli.
- **Adil zorluk**: zorluk artışı kontrollü, "near miss" gibi risk ödüllendirilmeli.
- **Metasistemler**: Echo Shards → Shop/Upgrades döngüsü uzun vadeli motivasyon sağlamalı.

## Ana Kullanım Senaryoları

| Senaryo | Akış |
|---------|------|
| Hızlı oyun | Menü → Başla → Skor kovala → Game Over → Tekrar |
| Günlük görev | Daily Challenge → Modifikasyonlu koşu → Ödül |
| İlerleme | Campaign → Hedef skor → Seviye tamamla |
| Kişiselleştirme | Shop → Skin/Theme al → Equip et |
| Construct deneyimi | 500+ skor → Token topla → Titan/Phase/Blink |

## Oyun İçi Deneyim Akışı

```
Başlangıç (0-500 skor)
├── Temel swap mekaniği öğren
├── Near miss bonusları keşfet
└── Rhythm streak başlat

Orta Oyun (500-2000 skor)
├── Glitch Token'lar belirir
├── Construct formlarını dene
├── Phantom engeller başlar
└── Dynamic midline aktif

İleri Oyun (2000+ skor)
├── Harmonic Resonance (10 streak)
├── S.H.I.F.T. harfleri topla
├── Overdrive mode
└── Gravity flip (1000+ skor)

Ölüm Sonrası
├── Second Chance (Construct aktifse)
├── System Restore (100 shard)
└── Game Over → Skor kaydet
```

## Başarı Ölçütleri

- ✅ Input gecikmesiz, 60fps hedefli akıcı loop
- ✅ Tutorial anlaşılır, fail anı "neden öldüm" hissi vermiyor
- ✅ Kalıcılık: ilerleme kaybolmuyor, bozulan storage durumlarında fallback çalışıyor
- ✅ 364 test geçiyor
- ✅ PWA olarak mobilde çalışıyor
