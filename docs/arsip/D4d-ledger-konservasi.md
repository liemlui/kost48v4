# D4d — ledger konservasi product/kerja/rencana (potret 2026-10-21)

> **LEDGER BATCH** · DOCS-GEN2 **D4d** · Status: **beku setelah D4d**
> · Baca kalau: memverifikasi pemindahan 23 berkas product/kerja/rencana dan memastikan pekerjaan terbuka tidak ikut terarsip.

**Tujuan.** Product **7 → 3**, kerja **21 → 8**, rencana **6 → 1**. Isi yang masih berlaku disalin per blok ke berkas aktif; berkas selesai/historis dipindah utuh. **Pekerjaan terbuka tidak diarsipkan**: 7 dokumen kerja aktif dipertahankan (lihat §4).

## 1. Ringkasan

| Ukuran | Nilai |
|---|---:|
| Berkas dipindah ke arsip | **23** (5 product + 6 rencana + 12 kerja) |
| Isi arsip identik setelah banner | **23/23** |
| Berkas baru | `docs/product/product.md` (gabungan 4 berkas product) |
| Product aktif | **3** (README + peran + product) |
| Kerja aktif | **5** (README + 4 dokumen; 4 task digabung ke TASK-AKTIF) |
| Rencana aktif | **1** (README) |

## 2. Product — 5 dipindah, 1 baru

| Berkas (arsip) | Isi ke | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Keterangan |
|---|---|---:|---:|---|---|---|
| [arah-produk.md](../arsip/arah-produk.md) | `product/product.md` | 17433 → 17605 | 103 → 104 | `b5c1eb1ba9c964a845089bf4fb014c6d7604095787312ac5490ecdb3de4b64b8` | `590daf5003b36f6513777eb2dfc6192deeb73ac6b7b3516be500d1ed21bcb28d` | product Bagian A — Arah produk |
| [mode-cepat.md](../arsip/mode-cepat.md) | — | 23551 → 23723 | 244 → 245 | `9732da4e3b0d5fb989d4d2e2ed35cf397cbdec9f2a49671f7d7a2f4858f4097e` | `8230240a8a985b0019aec8d4a4cc2151851e2d5f39e2cae7387cf343221137d9` | arsip — /cepat deprecated (DOCS-GEN2 Q1=a) |
| [orientasi.md](../arsip/orientasi.md) | `product/product.md` | 7937 → 8109 | 68 → 69 | `1a66031d46682ad8666abaf6b27d30d3e06777e3a78563e38bbd9fa475b52375` | `7e75a6827cd7a378d59bf27cdc5db8f88db50dda9006e910f8aec0fab02aa771` | product Bagian B — Orientasi |
| [portal-owner-admin.md](../arsip/portal-owner-admin.md) | `product/product.md` | 21852 → 22024 | 252 → 253 | `c3ae69693a7ee080155577eb6c7595b7a6693de23bbff89c1b9f5981ee955739` | `804e65d17126be968badbc5bffe0279de167f4743d437aebdb5e380242f9901c` | product Bagian C — Portal OWNER/ADMIN |
| [scope.md](../arsip/scope.md) | `product/product.md` | 17662 → 17834 | 257 → 258 | `210c8e8ee8d0e8770d4f031f56ed3d37db58a36b279e606002c78bb2a6e5a2ba` | `a56b06f85e19331ca3242b62a328cdf045fd503f132174b36d556d886f83a32c` | product Bagian D — Scope |

`docs/product/product.md`: **65622 byte**, 691 baris non-kosong, SHA-256 `9b047df412b395934543f73751f404f607a71125a527e158323a9491f175fa29`.

## 3. Rencana — 6 dipindah

| Berkas (arsip) | Isi ke | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Keterangan |
|---|---|---:|---:|---|---|---|
| [ADAPTASI-DOKTRIN-DOCS.md](../arsip/ADAPTASI-DOKTRIN-DOCS.md) | — | 15478 → 15650 | 77 → 78 | `2f6c499cc15b1d2d9ca87019ffd2a532c2b999f4bee595dd30d403fd3b4f427d` | `f0c59e59d5a4588b0d2b4f1639e76ec325f74806ecf18a4829ac6e0368a8679d` | rencana historis — adopsi doktrin |
| [ALAT-UKUR-KESEGARAN-DOCS.md](../arsip/ALAT-UKUR-KESEGARAN-DOCS.md) | — | 15803 → 15975 | 108 → 109 | `e8a95667d653a2e8f74257e28e469f928615936ccf49537b829c1804ef7d854f` | `13747f61fce73b65584e46828b29087ca8321d3438b2a19a23e31a3665444cd2` | rencana historis — alat ukur |
| [PERTANYAAN-ROMPAK.md](../arsip/PERTANYAAN-ROMPAK.md) | — | 14592 → 14764 | 113 → 114 | `cce957d119b73334946362e9011c24f94e11e61a4bcb37a4ffba735f02be7d1b` | `a0f33094c58229e635158b870c3861d899f30ccaefea39c4f0ee821da5f4e178` | rencana historis — pertanyaan rombak |
| [RENCANA-ROMPAK-DOCS.md](../arsip/RENCANA-ROMPAK-DOCS.md) | — | 16008 → 16180 | 121 → 122 | `36d2a54ad8ca46858b594901ddf3c900ef765d2c48248a9ccd4ef1ba4fefd780` | `9674149ef9e990e577bd46ae52c38bf08b773e3b34e124a03bc96e8636f52ca7` | rencana historis — rombak docs |
| [SERAH-SESI-DOCS.md](../arsip/SERAH-SESI-DOCS.md) | — | 13269 → 13441 | 57 → 58 | `3f70194f2490d024cbe9b88c851a8aee338d9b3460370a1d07872820231e9212` | `fdbf58119eccd616bc6f3425364f721e187bb675a71638ca0b0b4e44df7620d2` | rencana historis — serah sesi |
| [B2-pindah-keluar-repo.ps1](../arsip/B2-pindah-keluar-repo.ps1) | — | 13619 → 13757 | 235 → 236 | `cdace2b01d7f619c138f2ab57613d6b3b07dd529d24ffd983b67edebb969a7da` | `450928de429d96bcc7d7e58f190a1af0d69f2d084eb0262c9c235c3515d909df` | skrip rencana historis — B2 |

## 4. Kerja — 12 dipindah, 7 dipertahankan

| Berkas (arsip) | Isi ke | Byte | Baris non-kosong | SHA-256 sebelum | SHA-256 sesudah | Keterangan |
|---|---|---:|---:|---|---|---|
| [AUDIT-BUG-2026-10-20.md](../arsip/AUDIT-BUG-2026-10-20.md) | — | 7604 → 7774 | 84 → 85 | `b2e372801d2a702908d5b98fbedcaf9e58c609b8694f9b73c306fe82e7478cb5` | `b4a3f1512cd0b75d0c1b2d09234135d41a5dc5136cb952781092ad2f19f25de8` | audit bertanggal — selesai |
| [AUDIT-GOLIVE-2026-10-19.md](../arsip/AUDIT-GOLIVE-2026-10-19.md) | — | 25063 → 25233 | 140 → 141 | `43fdbe8312a53f4974e7cc4d4b3d7a585afbeecab27a81d08d830d54371abd14` | `582eb93b635d1826995f0bb036ceb0f546edd4bd654a955b1fdc07e05b885c89` | audit bertanggal — selesai |
| [LEMBAR-ISIAN-OWNER-GOLIVE.md](../arsip/LEMBAR-ISIAN-OWNER-GOLIVE.md) | — | 11587 → 11757 | 138 → 139 | `2b1bf1839808b97170058dde84294e252c15c700da5fea70b507ceadacfce12f` | `374543869f5f55d982d46b61db9211fe2dd5a9f210009a538ad84106f5e2f31b` | form owner — historis |
| [PROMPT-AUDIT-GOLIVE-2026-10-19.md](../arsip/PROMPT-AUDIT-GOLIVE-2026-10-19.md) | — | 7760 → 7930 | 52 → 53 | `064f7aa06d5db61f057ec782aab696744d6eb81f0a403bcebe67a19d0ca98d23` | `0a71bae73a8aac8a346e286db706f9895a9c586b0899cf5cf11959f5eb3bd1ea` | prompt sesi — historis |
| [PROMPT-BUG-DALAM-2026-10-20.md](../arsip/PROMPT-BUG-DALAM-2026-10-20.md) | — | 8674 → 8844 | 80 → 81 | `018962ea60f6f1198f321477ebd5a770e59045eda6597cfb5142933598e061f8` | `c4c04cc64c6e2bc3c50d68062f6aa8fa64d8358019ecf6070412f6462dade720` | prompt sesi — historis |
| [PROMPT-LANJUTAN-2026-10-18.md](../arsip/PROMPT-LANJUTAN-2026-10-18.md) | — | 7029 → 7199 | 70 → 71 | `a8c932e59b509e3b670204b3f1d71dfbbb9cde2005263095921f1d587e56e14f` | `6d082cff64eaf3d892f3259299ebe089799426c02af273a183c2fabcda6699e2` | prompt sesi — historis |
| [PROMPT-SESI-BERIKUTNYA.md](../arsip/PROMPT-SESI-BERIKUTNYA.md) | — | 9142 → 9312 | 89 → 90 | `f61bcb4e6207e03c97dcc43dc4012e5c1274bb208d0f9b3df168ca5af75eb975` | `944bb5f4c4e177f211abd3dfd794430388465bac57f74b11b14a3c9c63d840bc` | prompt sesi — digantikan SERAH-TERIMA |
| [TASK-AIDL-01a.md](../arsip/TASK-AIDL-01a.md) | — | 6991 → 7161 | 58 → 59 | `61138d73a033313b5d931294c6b08b38c02dee48184420371f5b0650bffbc26c` | `67b7e8e8d82b5fda7ea4ddccce071925ec125084cc6ec13a22e3025ecddcac3f` | task selesai — AIDL-01 |
| [TASK-AIDL-01b.md](../arsip/TASK-AIDL-01b.md) | — | 13061 → 13231 | 69 → 70 | `852ae306388ef375930164ee7cb9e80f75f53b44192c32d3935f22c30100c794` | `3f77a723a47d358f7f272e2113ce7d26038391c4be681259b23d4173ef66ad73` | task selesai — AIDL-01b |
| [TASK-AIDL-06.md](../arsip/TASK-AIDL-06.md) | — | 6668 → 6838 | 51 → 52 | `ad0403589cdaf689bee3621522005d270ead1f938ef62da4f2c0263cf2f3d1af` | `ddf38bb782bf3b5f28fb665f84c999167bcc44e5e59248af3fc0d1eddb1728b2` | task backlog — instrumentasi adopsi |
| [TASK-BOOKING-ONLINE.md](../arsip/TASK-BOOKING-ONLINE.md) | — | 6965 → 7135 | 55 → 56 | `3f04cb4b52b14aa399410fd92e0f17acd280467a3c090c0528a0394761bc28ea` | `93ff16e34f933036f39d714b0d79f215c958a2b55b12d0e93a8ee2097f694deb` | task backlog — booking online |
| [TASK-T05-DETEKTOR-ARSIP.md](../arsip/TASK-T05-DETEKTOR-ARSIP.md) | — | 8235 → 8405 | 61 → 62 | `90ba45fc3e21c31f8561c85c354a516174d7925f54295175f062e2017e94a297` | `d5acd27d4769e7ffcbebdc0266f527b3e1830ddcf3e534ec8eda9f6cd1bd149a` | task selesai — T-05 |

**Dipertahankan (pekerjaan terbuka):** `TASK-DOCS-GEN2.md`, `TANYA-OWNER.md`, `SERAH-TERIMA.md`, dan `TASK-AKTIF.md` (gabungan empat task terbuka). Empat task asli dipindah ke arsip tetapi isinya tetap aktif di TASK-AKTIF — lihat [addendum](D4d-addendum-task-aktif.md). Hasil kerja **5**.

## 5. Cara memeriksa

1. Buang banner + satu baris kosong dari 23 berkas arsip; SHA-256 sisa isi harus sama dengan kolom **sebelum**.
2. Isi product yang disalin ada di `product.md` sebagai bagian A–D dengan heading digeser +1; tidak ada baris isi yang dihapus.
3. Tautan aktif ke berkas lama sudah diarahkan ke berkas aktif + anchor atau ke arsip; gate R2/R6 = 0.

## 6. Riwayat

| Tanggal | Perubahan |
|---|---|
| 2026-10-21 | Dibuat: 23 berkas dipindah, product.md baru, 7 dokumen kerja aktif dipertahankan. |
