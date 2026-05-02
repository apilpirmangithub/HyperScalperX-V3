import readline from 'readline';
import fs from 'fs';
import { execSync } from 'child_process';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const ask = (query) => new Promise((resolve) => rl.question(query, resolve));

async function runSetup() {
    console.log("\n" + "=".repeat(50));
    console.log("👑  HyperScalperX - Mass Edition Setup  👑");
    console.log("=".repeat(50));
    console.log("\nSelamat datang! Mari siapkan bot trading Anda.\n");

    // 1. Private Key
    let pk = "";
    while (!pk.startsWith("0x") || pk.length !== 66) {
        pk = await ask("🔑 Masukkan Private Key Hyperliquid (0x...): ");
        if (!pk.startsWith("0x") || pk.length !== 66) {
            console.log("❌ Format Private Key salah. Harus diawali '0x' dan panjang 66 karakter.");
        }
    }

    // 2. Telegram
    console.log("\n--- Konfigurasi Notifikasi Telegram (Opsional) ---");
    const tgToken = await ask("📡 Masukkan Bot Token (Kosongkan jika tidak pakai): ");
    let tgId = "";
    if (tgToken) {
        tgId = await ask("🆔 Masukkan Chat ID Telegram Anda: ");
    }

    // 3. Build .env
    const envContent = `# 👑 HyperScalperX Configuration (User Settings)

# 🔑 Wallet Identity
PRIVATE_KEY=${pk}

# 📡 Telegram Notifications
TELEGRAM_BOT_TOKEN=${tgToken || 'your_bot_token'}
TELEGRAM_CHAT_ID=${tgId || 'your_chat_id'}

# Note: Core strategy (Leverage, TP/SL, Trailing) is LOCKED to owner's specifications.
`.trim();

    fs.writeFileSync('.env', envContent);
    console.log("\n✅ Berhasil! File .env telah dibuat.");

    // 4. Remote VPS Deployment Option
    console.log("\n" + "-".repeat(50));
    const wantDeploy = await ask("☁️  Apakah Anda ingin men-deploy bot ini ke VPS sekarang? (y/n): ");
    
    if (wantDeploy.toLowerCase() === 'y') {
        const host = await ask("🌐 Masukkan IP VPS: ");
        const user = await ask("👤 Masukkan Username VPS (default: root): ") || "root";
        const pass = await ask("🔑 Masukkan Password VPS: ");

        console.log("\n🚀 Memulai Remote Deployment (ini mungkin memakan waktu 2-3 menit)...");
        
        try {
            const { NodeSSH } = await import('node-ssh');
            const ssh = new NodeSSH();
            await ssh.connect({ host, username: user, password: pass });
            console.log("✅ Terhubung ke VPS!");

            console.log("📦 Menginstal Node.js & PM2 di VPS...");
            await ssh.execCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs && npm install -g pm2');

            console.log("📂 Mengunggah file bot...");
            await ssh.execCommand('mkdir -p /root/automaton');
            await ssh.putFile('.env', '/root/automaton/.env');
            await ssh.putFile('package.json', '/root/automaton/package.json');
            
            // Build locally first to ensure dist is ready
            console.log("🏗️  Membangun project lokal...");
            execSync('npm run build', { stdio: 'ignore' });
            await ssh.putDirectory('dist', '/root/automaton/dist', { recursive: true });

            console.log("⚙️  Menginstal dependensi di VPS...");
            await ssh.execCommand('npm install --omit=dev', { cwd: '/root/automaton' });

            console.log("🔥 Menyalakan bot di VPS...");
            await ssh.execCommand('pm2 delete all || true');
            await ssh.execCommand('pm2 start dist/index.js --name "HypeKing"', { cwd: '/root/automaton' });
            await ssh.execCommand('pm2 save');

            console.log("\n✨ DEPLOYMENT BERHASIL!");
            console.log(`Bot Anda sekarang berjalan 24/7 di VPS ${host}`);
        } catch (err) {
            console.log("\n❌ Gagal Deploy ke VPS: " + err.message);
            console.log("Jangan khawatir, bot tetap bisa dijalankan secara lokal di PC ini.");
        }
    } else {
        console.log("\n📦 Menginstal dependensi lokal...");
        try {
            execSync('npm install --omit=dev', { stdio: 'inherit' });
            console.log("✅ Instalasi lokal selesai.");
        } catch (e) {}
    }

    console.log("\n" + "=".repeat(50));
    console.log("🚀 SETUP SELESAI!");
    console.log("Untuk menyalakan bot lokal, ketik: npm start");
    console.log("=".repeat(50) + "\n");

    rl.close();
}

runSetup();
