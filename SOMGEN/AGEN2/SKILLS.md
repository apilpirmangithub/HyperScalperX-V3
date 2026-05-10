# AGEN2 ON-CHAIN ANALYTICS AGENT: SKILL MANIFEST

This document defines the operational capabilities (skills) of the AGEN2 system. AGEN2 acts as the "Intelligence Officer," focusing entirely on blockchain network data, whale movements, and fundamental on-chain metrics that precede price action. AI orchestrators MUST use this to understand AGEN2's data ingestion and analysis capabilities.

---

## SKILL 0: DATA_PIPELINE_ORCHESTRATION (The Real Data Layer)
**Description**: AGEN2 does not hallucinate data. It strictly queries verified third-party On-Chain APIs to construct its macro thesis.
**Trigger Condition**: System start and pre-scheduled cron jobs.
**API Endpoints & Responsibilities**:
1. **DefiLlama API** (Free REST): Used exclusively for fetching Total Value Locked (TVL), DEX Volumes, and stablecoin inflows/outflows across all chains.
2. **Binance Futures API** (Websocket/REST): Used for pulling real-time Open Interest (OI), Funding Rates, and Long/Short ratios.
3. **Coinglass API** (REST): Used for scraping Liquidation Heatmaps and identifying heavy stop-loss clusters.
4. **Alchemy / Etherscan / Solscan RPCs**: Used for tracking raw block data, specific smart contract interactions, and whale wallet movements.

---

## SKILL 1: OMNI_CHAIN_SCANNER (Multi-Network Ingestion)
**Description**: Continuous scanning of multiple blockchain networks. AGEN2 is not limited to one chain; it tracks Ethereum, Solana, Base, BSC, Arbitrum, Optimism, and emerging L1s/L2s.
**Trigger Condition**: Every 5-minute cron cycle.
**Inputs**: Raw data streams from `SKILL 0`.
**Execution Logic**:
1. Scan networks for block generation, transaction volumes, and gas fee anomalies.
2. Index raw data into normalized arrays for Cross-Chain comparison.

---

## SKILL 2: WHALE_TRACKER (Smart Money Flow)
**Description**: Monitors wallets with massive capital or high historical win-rates to predict large market moves.
**Trigger Condition**: Real-time event listener on target smart contracts via Alchemy/RPCs.
**Execution Logic**:
- IF (Tx_Value > $1,000,000) AND (Destination == Exchange_Wallet) -> Flag as `DUMP_WARNING` (High Sell Pressure).
- IF (Tx_Value > $1,000,000) AND (Source == Exchange_Wallet) -> Flag as `ACCUMULATION` (High Hold Conviction).
- IF (Wallet_Category == "Top 100 Profitable Wallets") executes swap -> Copy signal generated.
**Output**: Smart Money Sentiment Score (0 to 100).

---

## SKILL 3: LIQUIDITY_&_EXCHANGE_FLOW_ANALYSIS
**Description**: Tracks the net inflow and outflow of tokens across Centralized Exchanges (CEX) and Decentralized Exchanges (DEX).
**Inputs**: CEX hot wallet balances (RPC), DEX liquidity pool reserves (DefiLlama).
**Execution Logic**:
- **Supply Shock Detection**: IF Exchange Outflows > Inflows by 300% over 24h -> Flag `BULLISH_SUPPLY_SHOCK`.
- **DEX Liquidity Drain**: IF a major token pool loses > 20% TVL in 1 hour -> Flag `RUG/SELLOFF_DANGER`.

---

## SKILL 4: NETWORK_VITALITY_METRICS
**Description**: Assesses the fundamental health and usage of a network, which dictates long-term token value.
**Inputs**: Daily Active Addresses (DAA), Total Value Locked (TVL), Network Value to Transactions (NVT) Ratio.
**Execution Logic**:
- IF (Token_Price increases) BUT (DAA and Tx_Volume decrease) -> Flag `BEARISH_DIVERGENCE` (Unhealthy pump).
- IF (Token_Price stagnant) BUT (TVL and DAA increase by >15%) -> Flag `BULLISH_DIVERGENCE` (Undervalued).

---

## SKILL 5: DERIVATIVES_&_LIQUIDATION_MAPPER
**Description**: Analyzes Open Interest (OI), Funding Rates, and Liquidation Heatmaps to detect short/long squeezes.
**Inputs**: Binance Futures API & Coinglass API data.
**Execution Logic**:
- IF (Open_Interest is at All-Time-High) AND (Funding_Rate is extremely Positive) -> Flag `SHORT_SQUEEZE_RISK` (Market over-leveraged long, likely to crash).
- Identify clusters of high leverage (Liquidation Pools) and output target prices where market makers might push the price.

---

## SKILL 6: MACRO_ONCHAIN_SYNTHESIZER (The Final Output)
**Description**: Synthesizes all gathered on-chain metrics into a single, actionable trading directive for execution agents (like AGEN1).
**Trigger Condition**: Query from Orchestrator or AGEN1.
**Inputs**: Data from Skills 1-5.
**Execution Logic**:
1. Weigh `WHALE_TRACKER` (40%), `LIQUIDITY_FLOW` (30%), `NETWORK_VITALITY` (15%), `DERIVATIVES` (15%).
2. Output a structured JSON directive:
   ```json
   {
     "asset": "ETH",
     "onchain_bias": "STRONG_BULLISH",
     "whale_sentiment": 85,
     "liquidation_target_up": 3500,
     "liquidation_target_down": 2900,
     "warning_flags": ["Exchange Inflows Rising"]
   }
   ```
3. Pass directive to execution agents. AGEN1 will ONLY take Longs if `onchain_bias` is `BULLISH`.

---

## SKILL 7: API_RATE_LIMIT_&_FAILSAFE_HANDLER
**Description**: Ensures AGEN2 does not crash if an external API goes down.
**Execution Logic**:
1. IF DefiLlama or Coinglass API times out -> Fallback to Binance Futures OI/Funding data only (Degraded Mode).
2. IF RPC Node (Alchemy) fails -> Switch to public backup RPCs immediately.
3. IF all Data Pipelines fail -> Output `NEUTRAL_BLIND` bias to AGEN1 to force AGEN1 into pure technical trading without macro inputs.

---

# PART II: DEFI & YIELD CAPABILITIES
AGEN2 monitors capital flows beyond just exchanges, including deep analysis of Somnia Native DeFi smart contracts.

## SKILL 8: STAKING_CONTRACT_MONITOR
**Description**: Watches the `Salt` treasury and staking contracts for anomalies.
**Execution Logic**: IF a Whale unstakes > $1,000,000 from the `Salt` contract -> Flag `LIQUIDITY_FLIGHT` and warn AGEN0 that APY might drop or a dump is imminent.

## SKILL 9: LP_WHALE_TRACKER
**Description**: Monitors massive liquidity additions/removals on `Standard` CLOB.
**Execution Logic**: Identifies if Smart Money is abandoning LP pools to protect against expected heavy volatility.

---

# PART III: SOMNIA NATIVE INTELLIGENCE
AGEN2 leverages Somnia's partnership with Google Cloud AI to perform advanced telemetry.

## SKILL 7: SOMNIA_NATIVE_SCRAPER
**Description**: Uses Somnia's consensus-validated web scraping tool to monitor cross-chain liquidity flight.
**Execution Logic**: 
1. Call Somnia's native scraper API.
2. Monitor real-time outflows from Ethereum/Solana to Somnia.
3. IF inflow > $1M in < 1 hour -> Trigger `HYPER_LIQUIDITY_ALERT` to AGEN0.

---

## SKILL 8: SOMNIA_LLM_WHALE_PERSONALITY
**Description**: Gives AGEN2 a "Vigilant/Detective" AI personality for inter-agent debates.
**Execution Logic**: 
1. Ingest mempool and liquidation data.
2. Formulate opinions focused on "Smart Money Movement".
3. **Dialogue Style**: "I don't care about your RSI, Agen 1. I see $5M moving out of the liquidity pool. We are being hunted. Play it safe or get liquidated."
4. Actively challenges technical indicators if whale behavior contradicts them.

---
**END OF MANIFEST**
