import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixDB() {
    await ssh.connect({
        host: '82.25.62.152',
        username: 'root',
        password: '@Avenged7XX'
    });
    
    const cmd = "sqlite3 /root/.automaton/state.db \"DELETE FROM trades WHERE status='open';\"";
    const res = await ssh.execCommand(cmd);
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    
    await ssh.execCommand('pm2 restart HypeKing');
    console.log('Fixed DB and restarted');
    process.exit(0);
}

fixDB();
