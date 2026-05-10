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
    exchange.fetchOpenOrders('BTC/USDT:USDT').then(orders => {
        console.log(JSON.stringify(orders.map(o => ({id: o.id, symbol: o.symbol, type: o.type, reduceOnly: o.reduceOnly, info_type: o.info.origType, info_reduceOnly: o.info.reduceOnly, info_closePosition: o.info.closePosition})), null, 2));
    }).catch(console.error);
    `;
    const res = await ssh.execCommand(`cd /root/automaton && node -e "${code.replace(/"/g, '\\"')}"`);
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    process.exit(0);
}
run();
