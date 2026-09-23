# KOST48 V5 — Fase G AI Owner/Admin Approval Copilot

> **Rujukan arah aktif (6 Sep 2026):** [M02](M02_KEPUTUSAN_OWNER.md) untuk keputusan owner; [M12](M12_CHECKLIST_CHANGELOG.md#antrian-eksekusi-aktif) untuk satu checklist/urutan kerja; [M19](M19_EFISIENSI_HOSTING_512MB.md) untuk Fase EF. **EF diprioritaskan, satu proses API sebagai target, Fase MA ditunda.**
> Dokumen ini adalah **pintu masuk tematik**; isi rinci sudah dipindah ke lokasi kanonik di bawah. Status PASS/selesai pada audit lama hanya berlaku pada lingkup/waktu yang disebut, bukan bukti deployment atau runtime terbaru. Judul sumber pra-konsolidasi adalah riwayat; jangan membuat ulang file lama atau mengulang checklist selesai.

> Dossier baru untuk semua fitur DeepSeek/AI berbayar. Fokus: Owner dan Admin saja, selalu manual lewat tombol, hemat token, dan semua output yang mengubah data wajib menunggu persetujuan manusia.

## Tujuan

Fase G menjadikan AI sebagai pembantu keputusan Owner/Admin, bukan autopilot. AI boleh membaca snapshot data yang sudah diringkas, menyusun analisa, mengisi draft, memberi rekomendasi, dan menyiapkan payload. AI tidak boleh langsung menyetujui pembayaran, membuat jurnal, mengubah stok, memverifikasi KTP, menutup tiket, atau mengubah status kamar tanpa tombol persetujuan Owner/Admin.

## Isi & lokasi kanonik

| Topik | Lokasi kanonik | Catatan |
|---|---|---|
| Seluruh isi Fase G: pola aman/terlarang, struktur backend & frontend, budget/context, audit trail, fitur G0–G9, UAT, checklist eksekutor, Audit 360° P6 | [domain/ai.md](domain/ai.md) | Dipindah utuh apa adanya (B2, 23 Sep 2026); pemisahan audit/riwayat menyusul |
| Keputusan owner Fase G (D-23 dan turunannya) | [M02](M02_KEPUTUSAN_OWNER.md) | Tetap di M02 — tidak diubah |

- Lokasi kanonik isi rinci ada di tabel atas; file ini hanya pintu masuk agar tautan lama tetap resolve.
