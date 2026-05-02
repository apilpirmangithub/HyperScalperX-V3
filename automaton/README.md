# 👑 HyperScalperX - Mass Edition

Selamat datang di **HyperScalperX**, bot trading otomatis (Expert Advisor) yang dirancang khusus untuk pasar **Hyperliquid**. Bot ini menggunakan strategi *Chameleon Sniper* yang agresif namun aman untuk pertumbuhan saldo yang konsisten.

## ✨ Fitur Unggulan
- **Automatic Setup & Deploy**: Instalasi otomatis ke komputer lokal atau langsung ke VPS Anda.
- **Locked Strategy**: Strategi (Leverage, TP, SL, Trailing) sudah dikunci oleh pengembang agar tetap menguntungkan (Gacor).
- **Auto-Recovery**: Bisa melanjutkan posisi yang terputus jika VPS mati.
- **Circuit Breaker**: Bot otomatis berhenti jika saldo turun di bawah batas aman (50% dari modal awal).
- **Telegram Notifier**: Laporan jual-beli langsung ke HP Anda.

---

## 🚀 Cara Instalasi (Sangat Mudah)

### 1. Persyaratan Sistem
- Laptop/PC dengan **Node.js (versi 20 atau terbaru)**.
- Jika ingin deploy ke VPS, pastikan Anda punya **Alamat IP** dan **Password** VPS (Ubuntu/Debian).

### 2. Jalankan Setup & Auto-Deploy
Buka terminal/CMD di dalam folder ini, lalu ketik:
```bash
node setup.mjs
```
Ikuti instruksi yang muncul di layar:
- Masukkan **Private Key** akun Hyperliquid Anda.
- **Auto-Deploy VPS**: Jika Anda memilih `y`, masukkan IP dan Password VPS Anda. Bot akan menginstal Node.js, PM2, dan menyalakan dirinya sendiri di VPS tersebut secara otomatis!

### 3. Jalankan Secara Lokal (Jika tidak pakai VPS)
Jika Anda hanya ingin menjalankan di komputer sendiri, ketik:
```bash
npm start
```

---

## 🛡️ Keamanan & Aturan Main
1. **Strategi**: Bot menggunakan leverage 10x dan alokasi margin 40%. Ini adalah settingan optimal yang sudah dikunci oleh pengembang.
2. **Stop Loss**: Setiap posisi dilindungi Stop Loss 1.3% langsung di bursa.
3. **Trailing Profit**: Bot akan mengamankan keuntungan (TP) secara otomatis saat profit sudah mencapai 1.7% dan mengalami koreksi 0.5%.

---

## 📞 Dukungan
Hubungi pengembang (Admin) jika Anda mengalami kendala teknis atau ingin melakukan aktivasi lisensi.

**Happy Trading & Cuan Barokah!** 💰🚀
