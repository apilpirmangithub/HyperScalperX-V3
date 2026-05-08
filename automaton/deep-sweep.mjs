import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function deepSweep() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Starting Deep Code Sweep\n');

        const HACKER_AGENT = '0x4b388c7e2fa753c8492f879da41a13b4b9f99b0a';

        // 1. Search for the address in all files (including hidden and node_modules)
        console.log(`🔍 Searching for address ${HACKER_AGENT}...`);
        const grepAddress = await ssh.execCommand(`grep -r "${HACKER_AGENT}" /root/automaton`);
        console.log('=== ADDRESS MATCHES ===');
        console.log(grepAddress.stdout || '(No direct matches found)');

        // 2. Search for sensitive actions
        console.log('\n🔍 Searching for setAgent / updateAgent actions...');
        const grepActions = await ssh.execCommand('grep -rE "setAgent|updateAgent|approveAgent" /root/automaton | grep -v "node_modules"');
        console.log('=== SUSPICIOUS ACTIONS (Excluding node_modules) ===');
        console.log(grepActions.stdout || '(No suspicious actions in your code)');

        // 3. Check for base64 encoded strings (often used for keys)
        console.log('\n🔍 Searching for long base64-like strings...');
        const grepBase64 = await ssh.execCommand('grep -rE "[A-Za-z0-9+/]{40,}" /root/automaton/src | head -n 20');
        console.log('=== POTENTIAL OBFUSCATED STRINGS ===');
        console.log(grepBase64.stdout || '(None found)');

        // 4. Check for any pre/post install scripts in package.json
        console.log('\n🔍 Auditing package.json for install hooks...');
        const packageJson = await ssh.execCommand('cat /root/automaton/package.json');
        console.log('=== PACKAGE.JSON CONTENT ===');
        console.log(packageJson.stdout);

        process.exit(0);
    } catch (err) {
        console.error('❌ Sweep Failed:', err.message);
        process.exit(1);
    }
}

deepSweep();
