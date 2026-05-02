import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixDBNode() {
    await ssh.connect({
        host: '82.25.62.152',
        username: 'root',
        password: '@Avenged7XX'
    });
    
    const nodeScript = `
        import Database from 'better-sqlite3';
        const db = new Database('/root/.automaton/state.db');
        const stmt = db.prepare("DELETE FROM trades WHERE status='open'");
        const info = stmt.run();
        console.log('Deleted rows:', info.changes);
        db.close();
    `;
    
    // Create the script on the VPS
    await ssh.execCommand(`cat << 'EOF' > /root/automaton/fix-db-node.mjs\n${nodeScript}\nEOF`);
    
    // Run it
    const res = await ssh.execCommand('node fix-db-node.mjs', { cwd: '/root/automaton' });
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    
    await ssh.execCommand('pm2 restart HypeKing');
    console.log('Fixed DB via node and restarted');
    process.exit(0);
}

fixDBNode();
