import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function fixEnv() {
    await ssh.connect({
        host: '82.25.62.152',
        username: 'root',
        password: '@Avenged7XX'
    });
    
    await ssh.execCommand('echo "PRIVATE_KEY=0xd805eaf90aaa566c52d2c0987b13c9ce61a7feb731dd290411a4628060436740" > /root/automaton/.env');
    await ssh.execCommand('pm2 restart HypeKing');
    console.log('Fixed env and restarted');
    process.exit(0);
}

fixEnv();
