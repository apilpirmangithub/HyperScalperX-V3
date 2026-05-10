import ccxt from "ccxt";
import { classifyMarket, trendHunter, rangeSniper, volatilityBreaker, MarketType } from "./strategies.js";

interface ModeConfig {
    name: string;
    minBalance: number;
    leverage: number;
    riskPerTrade: number; // % of balance
    maxDrawdownExit: number; // %
}

const MODES: Record<string, ModeConfig> = {
    AGGRESSIVE: { name: "AGGRESSIVE", minBalance: 20, leverage: 50, riskPerTrade: 20, maxDrawdownExit: 50 },
    NORMAL: { name: "NORMAL", minBalance: 200, leverage: 10, riskPerTrade: 5, maxDrawdownExit: 20 },
    SAFETY: { name: "SAFETY", minBalance: 500, leverage: 3, riskPerTrade: 2, maxDrawdownExit: 10 }
};

async function runBacktest(asset: string, days: number, modeKey: string) {
    const config = MODES[modeKey];
    if (!config) throw new Error("Invalid Mode");

    console.log(`\n🧪 AGEN1 BACKTEST: ${asset}/USDT | MODE: ${config.name}`);
    console.log(`💰 Starting Balance: $${config.minBalance} | Leverage: ${config.leverage}x`);
    
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const limit = days * 24 * 4; // 15m candles
    const ohlcv = await binance.fetchOHLCV(`${asset}/USDT:USDT`, "15m", undefined, limit);
    
    let balance = config.minBalance;
    let wins = 0;
    let losses = 0;
    let totalTrades = 0;
    
    console.log(`📡 Data loaded: ${ohlcv.length} candles.`);

    for (let i = 100; i < ohlcv.length; i++) {
        const history = ohlcv.slice(i - 100, i);
        const type = classifyMarket(history);
        
        let signal: any = { direction: "NEUTRAL" };
        
        // Select Strategy based on Market Type
        if (type === "TRENDING_UP" || type === "TRENDING_DOWN") {
            signal = trendHunter(history, type);
        } else if (type === "SIDEWAYS") {
            signal = rangeSniper(history, type);
        } else if (type === "VOLATILE") {
            signal = volatilityBreaker(history, type);
        }

        if (signal.direction !== "NEUTRAL") {
            const entryPrice = ohlcv[i][4];
            const direction = signal.direction;
            const tpPct = signal.tp / 100;
            const slPct = signal.sl / 100;

            // Look ahead with TRAILING STOP
            let result = "TIMEOUT";
            let peakPnl = 0;
            
            for (let j = i + 1; j < Math.min(i + 48, ohlcv.length); j++) {
                const high = ohlcv[j][2];
                const low = ohlcv[j][3];
                const currentClose = ohlcv[j][4];

                const currentPnlPct = direction === "LONG" ? 
                    ((currentClose - entryPrice) / entryPrice) * 100 :
                    ((entryPrice - currentClose) / entryPrice) * 100;

                if (currentPnlPct > peakPnl) peakPnl = currentPnlPct;

                // 1. Check Hard SL
                if (direction === "LONG" && low <= entryPrice * (1 - slPct)) { result = "LOSS"; break; }
                if (direction === "SHORT" && high >= entryPrice * (1 + slPct)) { result = "LOSS"; break; }

                // 2. Check TP or Trailing Exit
                if (peakPnl >= signal.tp) {
                    // Once target hit, trail by 0.3%
                    if (currentPnlPct <= peakPnl - 0.3) {
                        result = "WIN";
                        break;
                    }
                }
            }


            if (result !== "TIMEOUT") {
                const margin = balance * (config.riskPerTrade / 100);
                const isWin = result === "WIN";
                
                // Compounding: Profit is added to balance, increasing next trade size
                const pnl = isWin ? (margin * config.leverage * tpPct) : -(margin * config.leverage * slPct);
                
                balance += pnl;
                totalTrades++;
                if (isWin) wins++; else losses++;

                if (balance <= config.minBalance * 0.2) {
                    console.log(`💀 [${asset}] ACCOUNT MARGIN CALL / STOPPED`);
                    break;
                }
            }
            
            i += 1; // Faster scanning but still avoids overlaps
        }
    }


    console.log(`\n📊 RESULTS [${config.name}]:`);
    console.log(`📈 Final Balance: $${balance.toFixed(2)}`);
    console.log(`💵 Total PnL   : ${(((balance / config.minBalance) - 1) * 100).toFixed(2)}%`);
    console.log(`🎯 Trades      : ${totalTrades} (Win Rate: ${((wins/totalTrades)*100 || 0).toFixed(1)}%)`);
    
    return {
        mode: config.name,
        finalBalance: balance,
        profitPct: ((balance / config.minBalance) - 1) * 100,
        winRate: (wins / totalTrades) * 100
    };
}

// Run sequence
async function main() {
    const assets = ["BTC", "ETH", "SOL", "LINK", "FET"];
    const results = [];

    for (const mode of ["SAFETY", "NORMAL", "AGGRESSIVE"]) {
        console.log(`\n--- TESTING MODE: ${mode} ---`);
        for (const asset of assets) {
            try {
                const res = await runBacktest(asset, 14, mode);
                results.push({...res, asset});
            } catch (e) {
                console.error(`Error ${asset}:`, e.message);
            }
        }
    }
    
    console.log("\n✅ ALL TESTS COMPLETE");
}

main();
