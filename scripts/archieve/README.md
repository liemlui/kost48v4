# scripts/archieve — artefak UAT/verifikasi rilis lama

Skrip di folder ini adalah artefak UAT & "VERIFY patch" **sekali-pakai per rilis** untuk
versi **V5.1–V5.8** (plus snapshot prestate lama). Sudah digantikan oleh rilis berikutnya
dan **tidak dirujuk** oleh `package.json` mana pun. Disimpan hanya sebagai jejak sejarah.

JANGAN dijalankan untuk verifikasi rilis saat ini. Untuk regresi/smoke terkini gunakan
skrip generasi V5.11–V5.13 di `scripts/uat/` dan `scripts/release/`.

Skrip go-live aktif ada di induk `scripts/` (`golive-all.mjs`, `golive-combined.mjs`,
`make-deploy.mjs`).
