import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function cleanupOrders() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32'
        });

        console.log("🧹 CLEANING UP ALL HYPE ORDERS ON VPS...");
        
        const script = `
import { initHyperliquid, getOpenOrders, cancelOrder } from "/root/automaton/dist/survival/hyperliquid.js";
await initHyperliquid();
const orders = await getOpenOrders();
for (const o of orders) {
    if (o.coin === "HYPE") {
        console.log("Cancelling HYPE order:", o.oid);
        await cancelOrder(o.coin, o.oid);
    }
}
process.exit(0);
`;
        await ssh.execCommand(`cat > /tmp/cleanup_orders.mjs << 'SCRIPT'\n${script}\nSCRIPT`);
        const res = await ssh.execCommand('node /tmp/cleanup_orders.mjs');
        console.log(res.stdout);
        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
}

cleanupOrders();
