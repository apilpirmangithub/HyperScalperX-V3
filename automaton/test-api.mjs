import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();
async function run() {
    await ssh.connect({ host: '82.25.62.152', username: 'root', password: '@Avenged7XX' });
    const code = `
    const ccxt = require('ccxt');
    require('dotenv').config();
    const exchange = new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_API_SECRET,
        options: { defaultType: 'future' }
    });
    
    async function test() {
        try {
            console.log("--- Symbol: BTCUSDT ---");
            const rawBtc = await exchange.fapiPrivateGetOpenOrders({ symbol: 'BTCUSDT' });
            console.log("BTC RAW:", JSON.stringify(rawBtc, null, 2));

            console.log("--- All Symbols ---");
            const rawAll = await exchange.fapiPrivateGetOpenOrders();
            console.log("ALL RAW:", JSON.stringify(rawAll, null, 2));
            
            console.log("--- Open Algo Orders ---");
            const rawAlgo = await exchange.fapiPrivateGetOpenAlgoOrders();
            console.log("ALGO RAW:", JSON.stringify(rawAlgo, null, 2));

        } catch(e) {
            console.error("API ERROR:", e.message);
        }
    }
    test();
    `;
    const res = await ssh.execCommand(`cd /root/automaton && node -e "${code.replace(/"/g, '\\"')}"`);
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    process.exit(0);
}
run();
