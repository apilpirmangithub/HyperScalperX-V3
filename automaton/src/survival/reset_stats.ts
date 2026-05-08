/**
 * RESET STATS — Membersihkan dashboard agar mulai dari $0.00 lagi.
 */
import admin from "firebase-admin";
import fs from "fs";

async function resetStats() {
    const serviceAccount = JSON.parse(fs.readFileSync("./firebase-key.json", "utf-8"));
    const dbUrl = "https://mytradingbot-e4f0d-default-rtdb.firebaseio.com";

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: dbUrl
    });

    const db = admin.database();
    const ref = db.ref("trading_stats");

    console.log("🧹 Membersihkan statistik lama di Firebase...");
    
    // Kita hapus node trading_stats agar bot membuat yang baru dengan saldo saat ini
    await ref.remove();

    console.log("✅ Statistik berhasil di-reset!");
    console.log("🚀 Tunggu 30 detik, bot di VPS akan mengirim data baru (Profit $0.00).");
    process.exit(0);
}

resetStats().catch(console.error);
