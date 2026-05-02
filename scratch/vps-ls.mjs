import { NodeSSH } from 'node-ssh';
const ssh = new NodeSSH();

async function run() {
    try {
        await ssh.connect({
            host: '144.172.100.244',
            username: 'root',
            password: 'rca8Dj48KzZwj6'
        });
        const result = await ssh.execCommand('ls -la /root/.automaton');
        console.log(result.stdout);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
