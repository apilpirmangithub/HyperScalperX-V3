import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function debugOrders() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32'
        });

        console.log("🔍 FETCHING RAW OPEN ORDERS FROM VPS...");
        
        const script = `
import { initHyperliquid, getOpenOrders } from "/root/automaton/dist/survival/hyperliquid.js";
await initHyperliquid();
const orders = await getOpenOrders();
console.log("---ORDERS_START---");
console.log(JSON.stringify(orders));
console.log("---ORDERS_END---");
process.exit(0);
`;
        await ssh.execCommand(`cat > /tmp/debug_orders.mjs << 'SCRIPT'\n${script}\nSCRIPT`);
        const res = await ssh.execCommand('node /tmp/debug_orders.mjs');
        
        if (res.stderr) console.error("Error:", res.stderr);
        
        const match = res.stdout.match(/---ORDERS_START---\n(.*)\n---ORDERS_END---/);
        if (match) {
            const orders = JSON.parse(match[1]);
            console.log(JSON.stringify(orders, null, 2));
        } else {
            console.log("Could not find order data in output:", res.stdout);
        }

        ssh.dispose();
    } catch (err) {
        console.error(err);
    }
}

debugOrders();
