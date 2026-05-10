# 🧠 SOMGEN AGENTIC SKILLS (SOMNIA NATIVE)

## SKILL 0: ADAPTIVE_RISK_PROFILING (THE COMMANDER'S GATE)
- **Description**: Menentukan parameter operasional berdasarkan input user (AGGRESSIVE, NORMAL, SAFETY).
- **Somnia Logic**: Mengatur slippage tolerance dan gas priority di jaringan Somnia secara otomatis.

## SKILL 1: SOMNIA_DIA_ORACLE_SCANNER
- **Description**: Ingesti data harga 100% akurat dari **DIA Oracle Smart Contract** di Somnia.
- **Feeds**: SOMI, WETH, BTC, USDC, USDT via contract `0xbA0E0...` (Mainnet).
- **Logic**: Melakukan cross-check harga antar pool Somnex untuk mendeteksi peluang arbitrase.

## SKILL 2: REGIME_CLASSIFIER (EVM-BASED)
- **Description**: Menentukan fase market menggunakan komputasi on-chain Somnia.
- **Indicators**: EMA (20/50/200) + ATR Calculation.
- **Goal**: Membedakan antara `TRENDING` (Hunt) dan `SIDEWAYS` (Yield Farming).

## SKILL 3: AUTONOMOUS_STRATEGY_ROUTER
- **Description**: Memutuskan apakah modal masuk ke Trading (Somnex Perps) atau DeFi (Somnia Vault).
- **DeFi Targets**: Somnex LP, Somnia Vault Auto-Compounder, stSOM Liquid Staking.
- **Trigger**: Jika Trading Conviction < 0.25, otomatis pindah ke High-Yield DeFi.

## SKILL 4: SOMNIA_AGENT_LLM_REASONING
- **Description**: Menggunakan **Somnia LLM SDK** untuk melakukan perdebatan "Peer Review" antar agen.
- **Personality**: Setiap agen memiliki profil unik (Teknis, On-Chain, Sentimen) yang saling mengaudit di level logika.
- **Consensus**: Mengambil keputusan final melalui modul `CollaborativeForum`.

## SKILL 5: WHALE_FLOW_INTEL (MEMPHIS STREAM)
- **Description**: Memantau aliran dana institusi menggunakan **Somnia Data Streams**.
- **Logic**: Veto otomatis jika deteksi Whale sedang melakukan distribusi (DUMP) saat teknikal menunjukkan BUY.

## SKILL 6: EMERGENCY_SAFETY_HALT
- **Description**: Protokol penghentian darurat jika terdeteksi anomali pada Smart Contract atau lonjakan volatilitas ekstrim.
- **Trigger**: Black Swan radar atau ketidaksesuaian data Oracle > 2%.

---
*Note: Seluruh skill ini beroperasi otonom di Agentic L1 Somnia Network.*
