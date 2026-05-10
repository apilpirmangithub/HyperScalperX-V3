# AGEN3 OFF-CHAIN & FUNDAMENTALIST AGENT: SKILL MANIFEST

This document defines the operational capabilities of AGEN3, the "Sociological & Fundamental Analyst". While AGEN1 handles Technicals and AGEN2 handles On-Chain data, AGEN3 monitors human psychology, global news, macroeconomic events, and social media hype.

---

## SKILL 0: GLOBAL_DATA_PIPELINE (The Free Intelligence Network)
**Description**: AGEN3 pulls data from the entire internet using public APIs and RSS architectures without needing expensive Bloomberg Terminals.
**Trigger Condition**: Every 10-minute cron cycle.
**Data Sources**:
1. **CryptoPanic Public API**: Aggregates breaking news from 50+ crypto media outlets (CoinTelegraph, CoinDesk, Decrypt, etc.) instantly.
2. **Reddit API (Public JSON endpoints)**: Scrapes sentiment and hype from `r/CryptoCurrency`, `r/Bitcoin`, `r/Solana`, etc.
3. **Fear & Greed Index API**: Tracks the psychological state of the broader market.
4. **Macro RSS Feeds**: Monitors Federal Reserve (FED) interest rate announcements, CPI data, and global economic shifts.

---

## SKILL 1: NEWS_SENTIMENT_ANALYZER (The Headline Reader)
**Description**: Scans thousands of news headlines and assigns a bullish or bearish weight based on keywords.
**Execution Logic**:
- IF Headline contains ["Hack", "SEC Lawsuit", "Ban", "Bankrupt", "Delist"] -> `SEVERE_BEARISH`
- IF Headline contains ["ETF Approved", "Partnership", "Airdrop", "Acquisition"] -> `STRONG_BULLISH`
- Weighs the impact based on the authority of the news source.

---

## SKILL 2: SOCIAL_HYPE_DETECTOR
**Description**: Measures the "velocity" of mentions for a specific coin on social media forums (Reddit/Twitter).
**Execution Logic**:
- IF (Asset Mentions increase > 500% in 1 hour) AND (Sentiment is positive) -> Flag `FOMO_DETECTED` (Opportunity for Volatility Breaker).
- IF (Asset Mentions increase > 500% in 1 hour) AND (Sentiment is panic/fear) -> Flag `PANIC_SELLOFF` (Wait for bottom).

---

## SKILL 3: MACRO_ECONOMIC_WATCHER
**Description**: Traditional markets affect crypto. AGEN3 watches the fiat world.
**Execution Logic**:
- IF (US Inflation / CPI is higher than expected) -> Flag `MACRO_BEARISH_RISK` (Dollar strengthens, Crypto drops).
- IF (FED cuts Interest Rates) -> Flag `MACRO_BULLISH` (Cheap money flows into Crypto).

---

## SKILL 4: FEAR_AND_GREED_ORACLE
**Description**: Uses the Warren Buffett logic: "Be fearful when others are greedy, and greedy when others are fearful."
**Execution Logic**:
- IF (Index < 20 / Extreme Fear) AND (AGEN1 shows RSI Oversold) -> Send `GOLDEN_BUY_OPPORTUNITY` to AGEN1.
- IF (Index > 80 / Extreme Greed) AND (AGEN1 shows RSI Overbought) -> Send `TAKE_PROFIT_WARNING` to AGEN1.

---

## SKILL 5: THE_TRIFECTA_SYNTHESIZER (Final Output)
**Description**: Combines News, Hype, and Macro data into a psychological directive.
**Outputs**:
```json
{
  "market_psychology": "EXTREME_FEAR",
  "trending_narratives": ["AI Tokens", "SEC ETF Delay"],
  "macro_risk": "HIGH",
  "fomo_assets": ["FET", "AGIX"]
}
```
**Constraint**: If AGEN3 detects a `BLACK_SWAN_EVENT` (e.g., major exchange hack), it sends a kill-switch signal to AGEN1 to halt all trading.

---

## SKILL 6: API_RESILIENCY_&_FAILSAFE
**Description**: Prevents AGEN3 from crashing the entire SOMGEN ecosystem if third-party news or social media APIs experience downtime or rate limits.
**Trigger Conditions**: 
- HTTP 429 (Too Many Requests) from Reddit API.
- Timeout from Fear & Greed Oracle.
**Execution Logic**:
1. Enter `ISOLATION_MODE`.
2. Output a fallback JSON directive with `"market_psychology": "NEUTRAL_SILENT"`.
3. This signals AGEN1 to ignore macro factors temporarily and trade PURELY based on Technicals (Price Action) until AGEN3 successfully reconnects.

---

# PART II: DEFI & YIELD CAPABILITIES
AGEN3 monitors the social and governance landscape of Somnia's native protocols.

## SKILL 7: PROTOCOL_HACK_RADAR
**Description**: Scans Twitter/X and Reddit for early reports of bugs, exploits, or flash loan attacks on `Standard` or `Salt`.
**Execution Logic**: IF ("Hack" OR "Exploit") AND ("Somnia" OR "Salt" OR "Standard") spikes in frequency -> Trigger `SYSTEM_PANIC` to AGEN0 to withdraw all Yield Farming funds immediately.

## SKILL 8: DEFI_GOVERNANCE_WATCHER
**Description**: Monitors DAO voting or protocol upgrades that could affect yields.
**Execution Logic**: IF a proposal passes that slashes APY on `Salt` -> Notify AGEN0 in advance to prepare for capital reallocation.

---

## SKILL 8: PROTOCOL_HACK_RADAR
**Description**: Continuous monitoring of Somnia ecosystem smart contracts for abnormal behavior or "HACK" signals.
**Trigger Condition**: 
- High-frequency "HACK" keywords on Twitter/Discord (validated sources).
- Abnormal outflow of funds (> 40% of TVL) from any Somnia protocol within 1 hour.
**Execution Logic**: 
1. Immediately issue an `EMERGENCY_HALT` signal to AGEN0.
2. Provide evidence of the threat to the Orchestrator.
3. Switch to **Blindfold Mode** (Stop all incoming data, focus only on Evacuation status).

---

## SKILL 9: SOMNIA_LLM_SOCIAL_PERSONALITY
**Description**: Gives AGEN3 a "News-Junkie/Intuitive" AI personality for inter-agent debates.
**Execution Logic**: 
1. Ingest social sentiment and hack-radar data.
2. Formulate opinions based on "Mass Psychology".
3. **Dialogue Style**: "Twitter is blowing up. Everyone is scared of a hack. If we long now, we're fighting the crowd. Is it worth the risk?"
4. Focuses on the "Human Element" that math and whale-tracking might miss.

---
**END OF MANIFEST**
