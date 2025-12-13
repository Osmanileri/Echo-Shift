# Active Context — Şu an ne yapıyoruz?

## Mevcut Odak

- Repo’ya **Memory Bank** metodolojisi entegre edildi:
  - Root `AGENTS.md`
  - `memory-bank/` altına çekirdek dosyalar

## Son Yapılanlar

- Memory Bank dosyaları ilk kez oluşturuldu ve mevcut kod tabanına göre dolduruldu.

## Bilinen Konular / Riskler

- `README.md` içeriği bu repo ile uyumsuz görünüyor (Expo temalı starter README).
- `prd.md` içeriği de mevcut projeyi yansıtmıyor (farklı bir ürün dokümanı).
- Storage key’lerde ikili durum: `constants.ts` içindeki `shadow_sync_highscore` ile `utils/persistence.ts` içindeki `echo-shift-*` anahtarları farklı prefix’lerde.

## Sonraki Adımlar (Opsiyonel)

- `README.md`’yi “Echo Shift” projesine uygun hale getirmek.
- `prd.md`’yi kaldırmak ya da `docs/` altına arşivlemek / güncellemek.
- Storage key konsolidasyonu (high score dahil) ve `safeClear` davranışını netleştirmek.


