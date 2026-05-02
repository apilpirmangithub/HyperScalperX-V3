import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function cleanAndRestart() {
    try {
        await ssh.connect({
            host: 'server021294638',
            username: 'root',
            password: '@venged7XXgg32',
            readyTimeout: 30000
        });

        console.log('Connected to VPS.');

        console.log('Stopping HypeKing...');
        await ssh.execCommand('npx pm2 stop HypeKing');

        console.log('Cleaning database...');
        // Delete the database to start with a clean slate
        const delResult = await ssh.execCommand('rm -f /root/.automaton/state.db');
        console.log('Database cleaned.');

        console.log('Starting HypeKing with NEXUS HOLY GRAIL...');
        const startResult = await ssh.execCommand('npx pm2 start HypeKing');
        console.log('Start Output:', startResult.stdout);

        console.log('VPS is now running clean with the new strategy!');
        process.exit(0);
    } catch (err) {
        console.error('FAILED:', err);
        process.exit(1);
    }
}

cleanAndRestart();
