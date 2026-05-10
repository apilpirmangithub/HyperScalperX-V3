import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function runTestTrade() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 20000
        });
        
        const testScript = `
import fs from 'fs';
import { BinanceExchange } from './dist/survival/binance.js';

async function testTrade() {
    console.log("Loading config...");
    const config = JSON.parse(fs.readFileSync('/root/.automaton/automaton.json', 'utf8'));
    
    console.log("Initializing Binance...");
    const exchange = new BinanceExchange(config.binanceApiKey, config.binanceApiSecret);
    await exchange.init();
    
    const asset = "DOGE"; // Cheap asset to test
    const midPx = await exchange.getMidPrice(asset);
    
    // Leverage is set to 20x in placeLimitOrder, but for market order we might need to set it first
    try { await exchange.client.setLeverage(20, \`\${asset}/USDT:USDT\`); } catch (e) {}
    try { await exchange.client.setMarginMode('CROSSED', \`\${asset}/USDT:USDT\`); } catch (e) {}
    
    const sizeAsset = 10 / midPx; // Minimal size for test ($10 position value)
    
    console.log(\`Opening LONG position on \${asset} size \${sizeAsset} (price: \${midPx})...\`);
    try {
        const sizePrecise = parseFloat(exchange.client.amountToPrecision(\`\${asset}/USDT:USDT\`, sizeAsset));
        const order = await exchange.client.createMarketOrder(
            \`\${asset}/USDT:USDT\`,
            'buy',
            sizePrecise
        );
        console.log("Order SUCCESS:", order.id, "Actual Size:", order.amount);
        
        console.log("Waiting 5 seconds before closing...");
        await new Promise(r => setTimeout(r, 5000));
        
        console.log("Closing position...");
        const closeOrder = await exchange.closePosition(asset, parseFloat(order.amount), true);
        console.log("Close SUCCESS:", closeOrder.id);
    } catch (e) {
        console.error("TRADE ERROR:", e.message);
    }
}
testTrade();
`;
        await ssh.execCommand(`cat << 'EOF' > /root/automaton/test-trade.mjs\n${testScript}\nEOF`);
        console.log('Running test on VPS...');
        const runRes = await ssh.execCommand('node test-trade.mjs', { cwd: '/root/automaton' });
        console.log(runRes.stdout || runRes.stderr);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runTestTrade();
