/**
 * PORTFOLIO BACKTEST — TRUE 30 DAYS (MULTI-BATCH)
 */
import ccxt from "ccxt";
import { analyzeChameleonWick, setStrategyConfig } from "./technicals.js";

async function runPortfolioBacktest() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    const assets = ["1000PEPE", "WIF", "DOGE", "1000BONK", "1000SHIB", "1000FLOKI", "BOME", "PENDLE", "ORDI", "1000SATS", "JUP", "PYTH", "TIA", "SEI", "GALA"];
    const days = 30;
    const initialBalance = 1000;
    let balance = initialBalance;
    let openTrade: any = null;
    let tradeHistory: any[] = [];

    console.log(`🚀 RUNNING WILD BACKTEST (MEME & HYPE ASSETS) FOR 30 DAYS...`);

    const allData: any = {};
    for (const asset of assets) {
        console.log(`📥 Fetching ${asset}...`);
        let allCandles: any[] = [];
        let since = Date.now() - (days * 24 * 60 * 60 * 1000);
        
        while (allCandles.length < days * 96) {
            const candles = await binance.fetchOHLCV(`${asset}/USDT:USDT`, "15m", since, 1000);
            if (candles.length === 0) break;
            allCandles = allCandles.concat(candles);
            since = candles[candles.length - 1][0] + 1;
        }
        allData[asset] = allCandles.map(c => ({ t: c[0], o: c[1], h: c[2], l: c[3], c: c[4], v: c[5] }));
    }

    const totalSteps = allData[assets[0]].length;
    console.log(`\n⏳ Menjalankan simulasi di ${totalSteps} titik waktu (Wild 30 Hari)...\n`);

    for (let i = 100; i < totalSteps; i++) {
        if (openTrade) {
            const cur = allData[openTrade.asset][i];
            const isLong = openTrade.side === "LONG";
            const highChg = ((cur.h - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);
            const lowChg = ((cur.l - openTrade.entry) / openTrade.entry) * 100 * (isLong ? 1 : -1);
            
            if (highChg >= 1.2) {
                const profit = balance * 0.40 * 20 * 0.012; 
                balance += profit;
                tradeHistory.push({ ...openTrade, exit: cur.t, result: "WIN", pnl: profit });
                openTrade = null;
            } else if (lowChg <= -1.0) {
                const loss = balance * 0.40 * 20 * -0.01; 
                balance += loss;
                tradeHistory.push({ ...openTrade, exit: cur.t, result: "LOSS", pnl: loss });
                openTrade = null;
            }
            continue;
        }

        const candidates: any[] = [];
        for (const asset of assets) {
            setStrategyConfig({ zThreshold: 2.6, wickThreshold: 0.05, tp: 1.2, sl: 1.0 });
            const sig = analyzeChameleonWick(allData[asset].slice(i - 100, i));
            if (sig.direction !== "NEUTRAL") {
                candidates.push({ asset, side: sig.direction, entry: allData[asset][i].o, score: Math.abs(sig.zScore || 0), time: allData[asset][i].t });
            }
        }

        if (candidates.length > 0) {
            openTrade = candidates.sort((a, b) => b.score - a.score)[0];
        }
    }

    const wins = tradeHistory.filter(t => t.result === "WIN").length;
    const winRate = (wins / tradeHistory.length) * 100;
    const totalPnl = balance - initialBalance;

    console.log("🏆 ═══════════════════════════════════════════════");
    console.log("   PORTFOLIO BACKTEST SUMMARY (WILD JACKPOT 30 DAYS)");
    console.log("═══════════════════════════════════════════════");
    console.log(`💰 Initial Balance : $1000`);
    console.log(`📈 Final Balance   : $${balance.toFixed(2)}`);
    console.log(`💵 Total Profit    : $${totalPnl.toFixed(2)} (${((totalPnl/initialBalance)*100).toFixed(2)}%)`);
    console.log(`🎯 Total Trades    : ${tradeHistory.length}`);
    console.log(`🔥 Win Rate        : ${winRate.toFixed(1)}%`);
    console.log("═══════════════════════════════════════════════\n");
}

runPortfolioBacktest().catch(console.error);
