# 👑 HyperScalperX - V3 Mass Edition

Selamat datang di **HyperScalperX V3**, bot trading otomatis (Expert Advisor) yang dirancang khusus untuk pasar kripto derivatif. Bot ini menggunakan strategi *Chameleon Sniper* yang agresif namun aman untuk pertumbuhan saldo yang konsisten.

---

## ✨ Fitur Utama
- **One-Click Deployment**: Instalasi otomatis ke komputer lokal atau VPS.
- **Locked Strategy**: Strategi inti sudah dikunci oleh pengembang untuk menjaga performa (Gacor).
- **Dynamic Compounding**: Besar posisi otomatis membesar seiring bertambahnya saldo Anda.
- **Circuit Breaker**: Bot berhenti otomatis jika modal turun 50% (Safety).
- **Telegram Notifier**: Laporan jual-beli real-time ke HP Anda.

---

## 🚀 Cara Instalasi (Langkah demi Langkah)

Pastikan Anda sudah menginstal **Node.js (v20+)** dan **Git** di komputer Anda.

### 1. Download / Clone Bot
Buka Terminal atau CMD, lalu jalankan perintah:
```bash
git clone https://github.com/apilpirmangithub/HyperScalperX-V3.git
cd HyperScalperX-V3
```

### 2. Masuk ke Folder Bot
```bash
cd automaton
```

### 3. Jalankan Setup Interaktif
Perintah ini akan menanyakan **Private Key** dan konfigurasi **Telegram** Anda secara otomatis:
```bash
node setup.mjs
```
> **Info**: Jika Anda ingin memasang di VPS, pilih `y` saat ditanya "Apakah ingin deploy ke VPS?". Masukkan IP dan Password VPS Anda, lalu bot akan menginstal dirinya sendiri di sana secara otomatis!

### 4. Menjalankan Bot
Jika Anda menginstal secara **Lokal** (di PC sendiri):
```bash
npm start
```

---

## 🛡️ Aturan Strategi (Locked & Valid)
Untuk menjaga performa tetap optimal, parameter berikut telah dikunci di dalam sistem:

1. **Single-Shot Sniper**: Bot hanya mengelola **Maksimal 1 Posisi Terbuka**. Bot tidak akan membuka posisi baru jika ada trade yang sedang berjalan.
2. **Dynamic Leverage**: Bot menggunakan pengali **10x dari Margin** yang digunakan.
   - *Contoh*: Jika modal margin yang digunakan $40, maka nilai posisi (Value) yang dibuka adalah $400.
3. **Margin Allocation**: Bot secara konsisten menggunakan **40% dari total saldo** per transaksi.
4. **Range 24 Jam**: Sinyal entry hanya dicari jika harga berada di area ekstrem (pucuk/lembah) dari rentang harga harian (High/Low 24 Jam).
5. **Hard Stop Loss**: 1.3% (Langsung dipasang di bursa).
6. **Trailing Profit**: Mulai aktif di 1.7%, tutup posisi jika terjadi koreksi 0.5% dari titik tertinggi.

---

## 📞 Dukungan & Lisensi
Hubungi Admin/Pengembang untuk bantuan teknis atau aktivasi akun.

**Happy Trading & Cuan Barokah!** 💰🚀
