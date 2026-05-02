# 👑 HyperScalperX - V3 Mass Edition

Selamat datang di **HyperScalperX V3**, bot trading otomatis (Expert Advisor) yang dirancang khusus untuk pasar **Hyperliquid**. Bot ini menggunakan strategi *Chameleon Sniper* yang agresif namun aman untuk pertumbuhan saldo yang konsisten.

---

## ✨ Fitur Utama
- **One-Click Deployment**: Instalasi otomatis ke komputer lokal atau VPS.
- **Locked Strategy**: Strategi (Leverage 10x, TP/SL, Trailing) sudah dikunci oleh pengembang.
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

Jika Anda menginstal di **VPS** (lewat Setup tadi), bot sudah otomatis jalan. Untuk memantau di VPS, gunakan:
```bash
pm2 status
pm2 logs HypeKing
```

---

## 🛡️ Aturan Strategi (Locked)
Untuk menjaga performa tetap "Gacor", parameter berikut telah dikunci:
- **Leverage**: 10x Cross.
- **Margin**: 40% dari total saldo per posisi.
- **Hard Stop Loss**: 1.3%.
- **Trailing Profit**: Mulai aktif di 1.7%, tutup posisi jika koreksi 0.5%.

---

## 📞 Dukungan & Lisensi
Hubungi Admin/Pengembang untuk bantuan teknis atau aktivasi akun.

**Happy Trading & Cuan Barokah!** 💰🚀
