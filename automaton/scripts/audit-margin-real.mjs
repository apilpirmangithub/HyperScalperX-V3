import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function auditMargin() {
    await ssh.connect({
        host: '82.25.62.152',
        username: 'root',
        password: '@Avenged7XX'
    });

    const script = `
        import { getOpenPositions, getBalance } from './dist/survival/hyperliquid.js';
        async function run() {
            const positions = await getOpenPositions();
            const balance = await getBalance();
            console.log(JSON.stringify({ positions, balance }, null, 2));
        }
        run();
    `;

    await ssh.execCommand(`cat << 'EOF' > /root/automaton/audit-margin.mjs\n${script}\nEOF`);
    const res = await ssh.execCommand('node audit-margin.mjs', { cwd: '/root/automaton' });
    
    const data = JSON.parse(res.stdout);
    const balance = data.balance.totalValue;
    const pos = data.positions[0]; // ETH position

    if (pos) {
        const marginUsed = pos.marginUsed;
        const marginPct = (marginUsed / balance) * 100;
        const posValue = pos.size * pos.entryPrice;
        const effectiveLev = posValue / marginUsed;

        console.log("==========================================");
        console.log(`💰 TOTAL SALDO (EQUITY): $${balance.toFixed(2)}`);
        console.log(`🛡️ MARGIN TERPAKAI     : $${marginUsed.toFixed(2)} (${marginPct.toFixed(2)}% dari saldo)`);
        console.log(`📈 NILAI POSISI (VALUE): $${posValue.toFixed(2)}`);
        console.log(`⚙️ LEVERAGE EFEKTIF    : ${effectiveLev.toFixed(2)}x`);
        console.log("==========================================");
    } else {
        console.log("Tidak ada posisi terbuka.");
    }
    process.exit(0);
}

auditMargin();
