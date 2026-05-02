
import fs from 'fs';

// --- KOPERASI PENGAWAS SULTAN (Audit Params) ---
const CONFIG = {
    initialBalance: 1000,
    assets: ["DOGE", "SOL"],
    stratMap: {
        "DOGE": { riskPct: 0.70, tpMulti: 5.0, slMulti: 2.0 },
        "SOL":  { riskPct: 0.70, tpMulti: 2.0, slMulti: 1.5 }
    },
    leverage: 10,
    maxPositions: 2,
    circuitBreaker: 0.85 // Matikan bot jika saldo < 85%
};

// --- MOCK INDICATORS (Replikasi technicals.ts) ---
function getAtrPct(price) { return 5.0; } // Asumsi ATR 5% untuk simulasi

// --- CORE SIMULATOR ---
function runSimulation(scenarioName, asset, steps) {
    console.log(`\n\n=== SCENARIO: ${scenarioName} (${asset}) ===`);
    let balance = CONFIG.initialBalance;
    let pos = null;
    const strat = CONFIG.stratMap[asset];
    const logs = [];

    for (let i = 0; i < steps.length; i++) {
        const price = steps[i];
        
        // 1. Check Circuit Breaker
        if (balance < CONFIG.initialBalance * CONFIG.circuitBreaker) {
            logs.push(`[Hour ${i}] 🚨 CIRCUIT BREAKER HIT! Equilibrium: $${balance.toFixed(2)}`);
            break;
        }

        // 2. Manage Open Position
        if (pos) {
            const pnlPct = pos.side === "LONG" 
                ? ((price - pos.entry) / pos.entry) * 100 * CONFIG.leverage
                : ((pos.entry - price) / pos.entry) * 100 * CONFIG.leverage;
            
            const pnlUsdc = (pnlPct / 100) * pos.margin;

            // Check TP / SL
            if (pnlPct >= pos.tp) {
                balance += pnlUsdc;
                logs.push(`[Hour ${i}] 🎯 TAKE PROFIT! Price: ${price.toFixed(4)} | PnL: +$${pnlUsdc.toFixed(2)} | Balance: $${balance.toFixed(2)}`);
                pos = null;
            } else if (pnlPct <= -pos.sl) {
                balance += pnlUsdc;
                logs.push(`[Hour ${i}] 🛑 STOP LOSS HIT! Price: ${price.toFixed(4)} | PnL: -$${Math.abs(pnlUsdc).toFixed(2)} | Balance: $${balance.toFixed(2)}`);
                pos = null;
            }
            continue;
        }

        // 3. Scan for Entry (Simulasi RSI Hit di Jam ke-1)
        if (i === 1) { 
            const entryPrice = price;
            const atr = getAtrPct(entryPrice);
            const tp = atr * strat.tpMulti;
            const sl = atr * strat.slMulti;
            
            const marginPerSlot = (balance - 1.0) / CONFIG.maxPositions;
            const marginUsed = marginPerSlot * strat.riskPct;
            
            pos = {
                entry: entryPrice,
                side: "LONG",
                margin: marginUsed,
                tp: tp,
                sl: sl
            };

            logs.push(`[Hour ${i}] 🚀 ENTRY LONG at ${entryPrice.toFixed(4)} | Margin: $${marginUsed.toFixed(2)} | SL: -${sl}% | TP: +${tp}%`);
        }
    }

    logs.forEach(l => console.log(l));
    console.log(`--- Final Balance: $${balance.toFixed(2)} ---`);
    return balance;
}

// === GENERATE SCENARIO DATA ===

// 1. DOGE MOONSHOT (Entry 0.16 -> Rally to 0.25)
const moonshotData = [0.16];
for(let i=0; i<10; i++) moonshotData.push(moonshotData[i] * 1.05);

// 2. SOL FLASH CRASH (Entry 185 -> Crash to 150)
const crashData = [185];
for(let i=0; i<10; i++) crashData.push(crashData[i] * 0.90);

// 3. SIDEWAYS CHOP (Entry 0.16 -> Floating)
const rangeData = [0.16, 0.161, 0.159, 0.162, 0.158, 0.16, 0.16];

// EXECUTE ALL BATTLES
runSimulation("MOONSHOT 🚀", "DOGE", moonshotData);
runSimulation("FLASH CRASH 📉", "SOL", crashData);
runSimulation("STAGNATION 🦀", "DOGE", rangeData);
