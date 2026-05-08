/**
 * HOT COINS BACKTEST — Cari koin paling rame di Binance Futures,
 * lalu backtest semuanya dengan settingan Super Sniper aktif.
 */
import ccxt from "ccxt";
import { runBacktest } from "./backtest_simulator.js";

async function findAndTestHotCoins() {
    const binance = new ccxt.binance({ options: { defaultType: 'future' } });
    await binance.loadMarkets();

    console.log("🔥 Mencari koin paling RAME di Binance Futures (30 hari terakhir)...\n");

    // Ambil semua ticker USDT Futures
    const tickers = await binance.fetchTickers();
    
    // Filter hanya USDT perpetual futures & sort by volume
    const usdtFutures = Object.values(tickers)
        .filter((t: any) => t.symbol.endsWith('/USDT:USDT') && t.quoteVolume > 0)
        .sort((a: any, b: any) => b.quoteVolume - a.quoteVolume)
        .slice(0, 30); // Top 30 by volume

    // Sort by price change % (paling volatile)
    const hotCoins = usdtFutures
        .sort((a: any, b: any) => Math.abs(b.percentage || 0) - Math.abs(a.percentage || 0))
        .slice(0, 15); // Top 15 paling volatile

    console.log("🏆 TOP 15 KOIN PALING RAME:");
    console.log("─────────────────────────────────────────");
    hotCoins.forEach((t: any, i: number) => {
        const name = t.symbol.split('/')[0];
        const change = (t.percentage || 0).toFixed(2);
        const vol = (t.quoteVolume / 1e9).toFixed(2);
        console.log(`${i+1}. ${name.padEnd(8)} | Change: ${change}% | Vol: $${vol}B`);
    });
    console.log("─────────────────────────────────────────\n");

    // Backtest semuanya
    console.log("🚀 MEMULAI BACKTEST MASSAL KOIN PALING RAME...\n");
    
    const results: any[] = [];
    for (const t of hotCoins) {
        const coin = t.symbol.split('/')[0];
        try {
            const result = await runBacktest(coin, 30);
            results.push({ coin, ...result });
        } catch (e: any) {
            console.log(`⚠️ Skip ${coin}: ${e.message}\n`);
        }
    }

    // Ranking
    console.log("\n\n🏆 ═══════════════════════════════════════════════");
    console.log("   FINAL RANKING — KOIN PALING RAME (30 HARI)");
    console.log("═══════════════════════════════════════════════\n");
    
    results.sort((a, b) => b.profit - a.profit);
    results.forEach((r, i) => {
        const icon = r.profit > 0 ? "✅" : "❌";
        const wr = r.totalTrades > 0 ? ((r.wins / r.totalTrades) * 100).toFixed(0) : "0";
        console.log(`${icon} ${(i+1).toString().padStart(2)}. ${r.coin.padEnd(8)} | Profit: ${r.profit.toFixed(2).padStart(7)}% | WR: ${wr}% | Trades: ${r.totalTrades}`);
    });

    const totalProfit = results.reduce((sum, r) => sum + r.profit, 0);
    const avgProfit = totalProfit / results.length;
    console.log(`\n📊 TOTAL PROFIT (${results.length} koin): ${totalProfit.toFixed(2)}%`);
    console.log(`📊 RATA-RATA PER KOIN: ${avgProfit.toFixed(2)}%`);
}

findAndTestHotCoins().catch(console.error);
