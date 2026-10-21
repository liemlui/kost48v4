> **ARSIP BEKU** · dipindah dari `docs/operations/` ke `docs/arsip/` pada 2026-10-21 (DOCS-GEN2 D4b). Isi dipindah ke berkas aktif operations — lihat ledger D4b; **jangan dibaca rutin**.

# Akses SSH ke Server Produksi

> **Blok baca** · Jenis: **runbook akses** · Status: **aktif (potret 2026-10-18)** · **Jangan** dibaca kalau: pekerjaan hanya di repo lokal dan tidak menyentuh server · Untuk siapa: sesi/agen yang perlu masuk server produksi · Baca kalau: butuh SSH/scp, restart Passenger, recon, atau rollback rilis.

> **Berkas ini memuat _path_ kunci, bukan isinya.** Jangan pernah menyalin kunci privat, isi `.env`, password, token, NIK, atau data tenant ke dokumen, chat, atau log. Kunci privat tidak pernah ditulis di sini.

## 1. Identitas server (terverifikasi 2026-10-18)

| Butir | Nilai |
|---|---|
| Host SSH | `api.kost48surabaya.com` → `203.161.184.69` |
| Port | `4422` (bukan 22) |
| User | `kost48s1` |
| Home | `/home/kost48s1` · hostname `batikan.idweb.host` · shell `/bin/bash` |
| Host key (expect) | `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDz1LkMb1mMgLlipEYHW8utncxyVjZk9C5ZMagDxBzxQ` |
| Panel | cPanel (LiteSpeed + Passenger), akun shared hosting, RAM 512 MB |

Cocokkan host key sebelum mengetik apa pun: `ssh-keygen -F '[api.kost48surabaya.com]:4422' -f kost48-known_hosts`.

## 2. Autentikasi

- Wajib **publickey**. Password ada di server, tetapi **tidak boleh** diminta, ditulis, atau ditempel agen — termasuk di chat dan log.
- Kunci rilis: `.ssh-kost48/kost48_deploy` (ED25519, tanpa passphrase), fingerprint
  `SHA256:lFhZEwXqjUMrGQlzUc6rsJGmWJkDvErDNmgG4xLQabg`.
- Kunci publiknya terpasang di `~/.ssh/authorized_keys` (komentar `dsh-release-2026-10-18`).
  Panel cPanel → SSH Access **tidak** menampilkan kunci ini; yang tampil di sana (`dsh-deploy-kost48`)
  adalah kunci lain buatan cPanel yang tidak dipakai agen.
- **Kunci privat tidak boleh di-commit.** `.ssh-kost48/` dan `kost48-known_hosts` sudah masuk
  `.gitignore`; tetap jangan pakai `git add -A`.
- Kunci hilang/dicabut → minta owner memasang ulang kunci publik (cPanel SSH Access → Import Key,
  atau `printf '%s\n' '<baris publik>' >> ~/.ssh/authorized_keys` dari sesi PuTTY milik owner).
  Jangan meminta password, jangan membuat kunci baru tanpa izin.
- Kunci ini memberi shell penuh sebagai `kost48s1`. Cabut barisnya di `~/.ssh/authorized_keys`
  begitu tidak dipakai.

## 3. Perintah yang bekerja di mesin ini

Windows + sandbox DSH: `%USERPROFILE%\.ssh` tidak bisa ditulis, jadi `known_hosts` disimpan di repo.

```powershell
$ssh = "C:\WINDOWS\System32\OpenSSH\ssh.exe"
& $ssh -p 4422 -i .ssh-kost48\kost48_deploy -o IdentitiesOnly=yes -o BatchMode=yes `
  -o UserKnownHostsFile=kost48-known_hosts kost48s1@api.kost48surabaya.com 'whoami; hostname'
```

```powershell
$scp = "C:\WINDOWS\System32\OpenSSH\scp.exe"
& $scp -P 4422 -i .ssh-kost48\kost48_deploy -o IdentitiesOnly=yes `
  -o UserKnownHostsFile=kost48-known_hosts .\skrip.sh kost48s1@api.kost48surabaya.com:~/
```

- Perintah panjang: kirim sebagai berkas (`scp`), jalankan `ssh … 'bash ~/skrip.sh; rm -f ~/skrip.sh'`.
- **Jangan** menaruh `$()`, `|`, atau kutip ganda di dalam string perintah satu-baris: PowerShell membuang
  kutipnya lalu bash memecah perintah (pernah menghasilkan `syntax error near unexpected token` dan
  `command not found`). Berkas skrip menghindari seluruh kelas kesalahan ini.
- Heredoc di server: pakai `cat > ~/x.sh <<'EOF' … EOF` lalu `bash ~/x.sh`.

## 4. Peta server (potret 2026-10-18)

| Butir | Nilai |
|---|---|
| `APP_ROOT` | `/home/kost48s1/kost48-prod` — `dist/`, `client/`, `node_modules/`, `prisma/`, `sql/`, `scripts/`, `.env`, `uploads/`, `stderr.log`, `tmp/` |
| `PUBLIC_ROOT` | `/home/kost48s1/public_html` — `.htaccess` memuat `PassengerAppRoot` + `PassengerStartupFile dist/main.js`, Node `nodevenv/kost48-prod/22` |
| Paket | profil `combined`: frontend dilayani proses Nest yang sama (`VITE_API_BASE_URL=/api`, satu origin) |
| Restart | `mkdir -p /home/kost48s1/kost48-prod/tmp && touch /home/kost48s1/kost48-prod/tmp/restart.txt` |
| Log | `~/kost48-prod/stderr.log` · `~/access-logs/kost48surabaya.com-ssl_log` (jangan dump penuh) |
| Backup rilis | `~/backup-YYYYmmdd-HHMM-uiux/` (`dist`, `client`, `env.backup` mode 600, `package.json`) |

Rollback (hanya bila smoke gagal). **Cek path dulu**, baru hapus:

```bash
APP=/home/kost48s1/kost48-prod; BK=~/backup-20261018-0729-uiux
echo "APP=$APP"; ls -la "$APP" | head
rm -rf "$APP/dist" "$APP/client" && cp -a "$BK/dist" "$BK/client" "$APP/" && touch "$APP/tmp/restart.txt"
```

## 5. Larangan di server

Tanpa `npm install`/`npm ci`, build, `prisma generate`/`db push`, seed (`node scripts/seed-owner.js`),
atau migrasi. Tanpa menghentikan/menonaktifkan service lain. Tanpa menimpa `.env` dan `uploads/`.
Tanpa `cat` isi `.env`, `.bash_history`, atau `~/OWNER-PASSWORD-BACA-LALU-HAPUS.txt` — berkas itu **ada**,
dan isinya tidak boleh dibaca, disalin, atau ditampilkan. Jalur saja yang boleh dilaporkan.

## 6. Jebakan yang sudah terbukti

- RAM akun **512 MB**; satu proses app ≈ 185–207 MB. Build/npm di server berisiko OOM — paket dibuat di lokal.
- `/` setelah restart bisa **±20 detik** (cold start); panggilan berikutnya ±0,05 s. Satu request pertama
  tidak boleh dipakai menyimpulkan "down".
- `app.kost48surabaya.com` dan `api.kost48surabaya.com` **tidak** melayani aplikasi (`app./rooms` = 404,
  `app./` = halaman "Index of /"). Smoke hanya di `https://kost48surabaya.com`.
- `curl` HTTPS dari shell DSH gagal (`SEC_E_NO_CREDENTIALS`). Jalankan curl **di server**, bukan di workstation;
  kegagalan curl lokal bukan bukti situs mati.
- Monitor kualitas hosting memeriksa `api.kost48surabaya.com` (404 permanen). Alert uptime dari panel itu
  bukan bukti situs down — buktinya log akses (`200` dominan, `0 × 5xx` pada 18 Okt 2026).
- Ekstraksi arsip menimpa `dist/` + `client/` + `node_modules/`; `uploads/` dan `.env` tidak ada di dalam arsip,
  jadi aman. Tetap backup dulu.

## 7. Jejak akses terakhir

2026-10-18 07:29–07:36 WIB: recon, backup (`backup-20261018-0729-uiux`, 57 MB), unggah 43.033.340 byte
(SHA-256 `9a76dc23…fe39b`), extract, restart, smoke 4 URL `200`, buildId `BZ-Vpsd9eLX1` → `0Dc2WPRpp8Me`.
Rincian: `docs/arsip/bukti-2026-10.md` §15.
