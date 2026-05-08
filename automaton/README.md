# 👑 HyperScalperX - The Ultimate Predator (V11.7) 🦎

**HyperScalperX** is a high-frequency, autonomous trading engine designed for **Binance Futures**. It utilizes the specialized **Chameleon Wick Sniper V3** strategy, optimized through rigorous 30-day multi-asset backtesting to capture high-probability liquidity wick rejections.

---

## 💎 Key Features

- **🎯 Sniper Entry (Market Flow)**: Uses instant Market Orders to capture fast-moving liquidity wicks, ensuring a 100% fill rate for "Jackpot" signals.
- **📈 Unleashed Trailing Stop**: Features a dynamic trailing mechanism that captures extended moves beyond fixed targets. Starts trailing at **1.2%** with a **0.5%** callback.
- **🛡️ Zero-Gap Protection**: Automatically places a Hard Stop Loss (1.0%) on the exchange the millisecond a trade is opened, eliminating the "Death Zone" vulnerability.
- **⚡ Autonomous Lifecycle**: Designed to run 24/7 on a VPS with zero manual intervention. Includes auto-recovery, pm2 integration, and self-healing exchange synchronization.
- **🏦 Exchange Harmony**: Automatically forces Binance accounts into **One-Way Mode** and **Cross Margin**, while performing a total cleanup of stale orders after every trade.
- **🖥️ Real-time Dashboard**: Integrated with Firebase for a high-fidelity, low-latency performance dashboard.
- **📡 Telegram Interactive Control**: Fully controllable via Telegram with commands: `/status`, `/list`, `/balance`, and `/stop` (Emergency Killswitch).

---

## 🦎 The "Jackpot" Strategy (V8 Optimized)

Based on 30 days of historical data research, the bot is locked into the following "Golden Ratio" parameters:
- **Z-Score Threshold**: `2.6`
- **Wick Rejection**: `0.05`
- **Minimum Target**: `1.2%`
- **Stop Loss**: `1.0%`
- **Asset List**: 15 Top Crypto Assets (SOL, ETH, BTC, NEAR, AVAX, etc.)

---

## 🚀 Quick Start (VPS Deployment)

1. **Environment Setup**:
   Create a `.env` file with your credentials:
   ```env
   EXCHANGE_TYPE=binance
   BINANCE_API_KEY=your_key
   BINANCE_API_SECRET=your_secret
   TELEGRAM_BOT_TOKEN=your_token
   TELEGRAM_CHAT_ID=your_id
   FIREBASE_SERVICE_ACCOUNT=/root/firebase-key.json
   FIREBASE_DB_URL=your_db_url
   ```

2. **Deploy**:
   ```bash
   npm run build
   node deploy_to_binance_vps.mjs
   ```

3. **Monitor**:
   Check logs on VPS:
   ```bash
   pm2 logs HypeKing
   ```

---

## 🛡️ Risk Management

- **Circuit Breaker**: The bot will automatically halt all activities if the account balance drops below **$5.00**.
- **Lot Size Control**: Margin is dynamically calculated as **40%** of the available equity per trade.
- **Order Cleanup**: Ensures no "Ghost SL/TP" orders remain active after a trade is concluded.

---

## ⚠️ Disclaimer
This is a high-risk autonomous trading system. Use it with caution and only with capital you can afford to lose. The developers are not responsible for any financial losses.

---

**Developed with 💎 by HyperScalperX Team**
