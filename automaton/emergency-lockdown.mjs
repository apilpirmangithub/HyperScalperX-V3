import { NodeSSH } from 'node-ssh';

const ssh = new NodeSSH();

async function secureVPS() {
    try {
        await ssh.connect({
            host: '82.25.62.152',
            username: 'root',
            password: '@Avenged7XX',
            readyTimeout: 30000
        });
        console.log('✅ Connected — Starting Emergency Lockdown\n');

        // ============================================================
        // STEP 1: KICK THE ATTACKER (Ukrainian IP 185.115.37.43)
        // ============================================================
        console.log('🔴 [1/6] KICKING ATTACKER...');
        
        // Find and kill all SSH sessions from attacker IPs
        const killUA = await ssh.execCommand('pkill -9 -f "sshd.*185.115.37.43" 2>/dev/null; echo "Killed UA sessions"');
        console.log('  → Ukrainian IP:', killUA.stdout);
        
        const killRU = await ssh.execCommand('pkill -9 -f "sshd.*77.35.193.51" 2>/dev/null; echo "Killed RU sessions"');
        console.log('  → Russian IP:', killRU.stdout);

        // Kill the specific pts/0 terminal used by attacker
        const killPts = await ssh.execCommand('skill -KILL -t pts/0 2>/dev/null; echo "Killed pts/0"');
        console.log('  → pts/0:', killPts.stdout);

        // Verify attacker is gone
        const whoAfter = await ssh.execCommand('who');
        console.log('  → Active sessions after kick:', whoAfter.stdout || '(none - clean!)');

        // ============================================================
        // STEP 2: REMOVE ATTACKER SSH KEY (backdoor)
        // ============================================================
        console.log('\n🔴 [2/6] REMOVING BACKDOOR SSH KEY...');
        
        // Show current key before removal
        const currentKey = await ssh.execCommand('cat /root/.ssh/authorized_keys 2>/dev/null');
        console.log('  → Current key:', currentKey.stdout.substring(0, 60) + '...');
        
        // Wipe authorized_keys completely
        const wipeKeys = await ssh.execCommand('echo "" > /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys');
        console.log('  → authorized_keys WIPED ✅');
        
        // Verify
        const verifyKeys = await ssh.execCommand('cat /root/.ssh/authorized_keys; echo "---"; wc -c /root/.ssh/authorized_keys');
        console.log('  → Verify:', verifyKeys.stdout);

        // ============================================================
        // STEP 3: FIX FILE PERMISSIONS (wallet.json & .env)
        // ============================================================
        console.log('\n🔴 [3/6] FIXING FILE PERMISSIONS...');
        
        const fixPerms = await ssh.execCommand('chmod 600 /root/automaton/.env /root/.automaton/wallet.json 2>/dev/null && echo "Permissions fixed"');
        console.log('  → .env & wallet.json:', fixPerms.stdout);
        
        // Verify
        const verifyPerms = await ssh.execCommand('ls -la /root/automaton/.env /root/.automaton/wallet.json 2>/dev/null');
        console.log('  → Verify:', verifyPerms.stdout);

        // ============================================================
        // STEP 4: ENABLE FIREWALL (UFW)
        // ============================================================
        console.log('\n🔴 [4/6] ENABLING FIREWALL...');
        
        // Reset and configure UFW
        const ufw1 = await ssh.execCommand('ufw --force reset 2>/dev/null');
        console.log('  → UFW reset:', ufw1.stdout.trim());
        
        const ufw2 = await ssh.execCommand('ufw default deny incoming');
        console.log('  → Default deny incoming:', ufw2.stdout.trim());
        
        const ufw3 = await ssh.execCommand('ufw default allow outgoing');
        console.log('  → Default allow outgoing:', ufw3.stdout.trim());
        
        const ufw4 = await ssh.execCommand('ufw allow 22/tcp comment "SSH"');
        console.log('  → Allow SSH:', ufw4.stdout.trim());
        
        const ufw5 = await ssh.execCommand('ufw allow 3000/tcp comment "Bot Dashboard"');
        console.log('  → Allow Dashboard:', ufw5.stdout.trim());
        
        const ufw6 = await ssh.execCommand('echo "y" | ufw enable');
        console.log('  → UFW enabled:', ufw6.stdout.trim());
        
        // Verify
        const ufwStatus = await ssh.execCommand('ufw status verbose');
        console.log('  → Status:\n', ufwStatus.stdout);

        // ============================================================
        // STEP 5: HARDEN SSH CONFIG
        // ============================================================
        console.log('🔴 [5/6] HARDENING SSH CONFIG...');
        
        // Add MaxAuthTries and LoginGraceTime to limit brute force
        const hardenSSH = await ssh.execCommand(`
            grep -q "MaxAuthTries" /etc/ssh/sshd_config && sed -i 's/.*MaxAuthTries.*/MaxAuthTries 3/' /etc/ssh/sshd_config || echo "MaxAuthTries 3" >> /etc/ssh/sshd_config
            grep -q "LoginGraceTime" /etc/ssh/sshd_config && sed -i 's/.*LoginGraceTime.*/LoginGraceTime 30/' /etc/ssh/sshd_config || echo "LoginGraceTime 30" >> /etc/ssh/sshd_config
            grep -q "ClientAliveInterval" /etc/ssh/sshd_config || echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
            grep -q "ClientAliveCountMax" /etc/ssh/sshd_config || echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config
            echo "SSH config hardened"
        `);
        console.log('  →', hardenSSH.stdout);
        
        // Restart SSH to apply changes
        const restartSSH = await ssh.execCommand('systemctl restart sshd && echo "SSHD restarted"');
        console.log('  →', restartSSH.stdout);

        // ============================================================
        // STEP 6: INSTALL FAIL2BAN (auto-ban brute force IPs)
        // ============================================================
        console.log('\n🔴 [6/6] INSTALLING FAIL2BAN...');
        
        const installF2b = await ssh.execCommand('apt-get install -y fail2ban 2>/dev/null | tail -3');
        console.log('  → Install:', installF2b.stdout);
        
        // Configure fail2ban for SSH
        const configF2b = await ssh.execCommand(`
            cat > /etc/fail2ban/jail.local << 'EOF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF
            systemctl enable fail2ban 2>/dev/null
            systemctl restart fail2ban 2>/dev/null
            echo "Fail2ban configured and started"
        `);
        console.log('  →', configF2b.stdout);

        // ============================================================
        // FINAL VERIFICATION
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('✅ LOCKDOWN COMPLETE — VERIFICATION');
        console.log('='.repeat(60));
        
        const finalWho = await ssh.execCommand('who');
        console.log('\n👤 Active users:', finalWho.stdout || '(none)');
        
        const finalUfw = await ssh.execCommand('ufw status | head -10');
        console.log('\n🛡️ Firewall:', finalUfw.stdout);
        
        const finalKeys = await ssh.execCommand('wc -c /root/.ssh/authorized_keys');
        console.log('\n🔑 authorized_keys size:', finalKeys.stdout);
        
        const finalPerms = await ssh.execCommand('stat -c "%a %n" /root/automaton/.env /root/.automaton/wallet.json 2>/dev/null');
        console.log('\n🔐 File permissions:', finalPerms.stdout);
        
        const finalF2b = await ssh.execCommand('fail2ban-client status sshd 2>/dev/null | head -10');
        console.log('\n🚫 Fail2ban:', finalF2b.stdout || '(starting up...)');

        console.log('\n⚠️  REMAINING MANUAL STEPS:');
        console.log('   1. Ganti password root: ssh ke VPS lalu jalankan "passwd"');
        console.log('   2. Pertimbangkan ganti private key wallet (yang lama sudah exposed)');
        console.log('   3. Hubungi Hyperliquid support soal multi-sig');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Lockdown Failed:', err.message);
        process.exit(1);
    }
}

secureVPS();
