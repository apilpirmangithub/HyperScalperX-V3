
import { loadConfig } from './src/survival/config';
import { initTelegram, startTelegramPolling } from './src/survival/telegram';
import { initHyperliquid, getSultanStats } from './src/survival/hype-king-loop';
import * as fs from 'fs';

async function diagnose() {
    const log = (msg: string) => {
        console.log(msg);
        fs.appendFileSync('diag.log', `[${new Date().toISOString()}] ${msg}\n`);
    };

    if (fs.existsSync('diag.log')) fs.unlinkSync('diag.log');

    try {
        log('Starting Sultan Agung Diagnostics...');
        
        log('1. Loading Config...');
        const config = loadConfig();
        log('Config loaded successfully.');

        log('2. Initializing Telegram...');
        initTelegram(config.telegramToken, parseInt(config.telegramChatId));
        log('Telegram client initialized.');

        log('3. Starting Telegram Polling (Early)...');
        // Define a minimal control object
        const dummyControl = {
            getStats: async () => ({ balance: '0', positions: [], orders: [] }),
            getOpenTrades: async () => 'No trades',
            stopBot: async () => { log('Stop requested'); }
        };
        startTelegramPolling(dummyControl as any);
        log('Telegram polling started.');

        log('4. Initializing Hyperliquid (Suspected hanging point)...');
        await initHyperliquid();
        log('Hyperliquid initialized successfully.');

        log('5. Fetching Stats...');
        const stats = await getSultanStats();
        log(`Stats fetched: Balance = ${stats.balance}`);

        log('DIAGNOSTICS COMPLETE - SYSTEM OPERATIONAL');
    } catch (error: any) {
        log(`DIAGNOSTICS FAILED: ${error.message}`);
        if (error.stack) log(error.stack);
    } finally {
        process.exit(0);
    }
}

diagnose();
