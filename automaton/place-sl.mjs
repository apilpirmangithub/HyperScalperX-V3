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
    
    // Attempt to place a STOP_MARKET for BTC
    exchange.fetchPositions().then(async (positions) => {
        const btcPos = positions.find(p => p.symbol === 'BTC/USDT:USDT' && parseFloat(p.contracts) !== 0);
        if(!btcPos) { console.log("No BTC Position"); return; }
        
        console.log("Found BTC Pos:", btcPos.side, btcPos.contracts, btcPos.entryPrice);
        const isLong = btcPos.side === 'long';
        const size = Math.abs(parseFloat(btcPos.contracts));
        const entry = parseFloat(btcPos.entryPrice);
        const slPrice = isLong ? entry * 0.99 : entry * 1.01;
        
        try {
            const res = await exchange.createOrder(
                'BTC/USDT:USDT',
                'STOP_MARKET',
                isLong ? 'sell' : 'buy',
                parseFloat(exchange.amountToPrecision('BTC/USDT:USDT', size)),
                undefined,
                {
                    'stopPrice': exchange.priceToPrecision('BTC/USDT:USDT', slPrice),
                    'reduceOnly': true
                }
            );
            console.log("ORDER PLACED:", JSON.stringify(res, null, 2));
            
            const openOrders = await exchange.fetchOpenOrders('BTC/USDT:USDT');
            console.log("OPEN ORDERS NOW:", JSON.stringify(openOrders.map(o=>({id:o.id, reduceOnly:o.reduceOnly, type:o.type})), null, 2));
        } catch(e) {
            console.error("ERROR PLACING SL:", e.message);
        }
    }).catch(console.error);
    `;
    const res = await ssh.execCommand(`cd /root/automaton && node -e "${code.replace(/"/g, '\\"')}"`);
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    process.exit(0);
}
run();
