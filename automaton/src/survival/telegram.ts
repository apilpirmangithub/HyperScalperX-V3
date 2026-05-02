import axios from "axios";
import { loadConfig } from "../config.js";

let botToken: string | undefined;
let chatId: string | undefined;
let lastUpdateId = 0;

export interface SultanControl {
    getStatus: () => Promise<string>;
    getOpenTrades: () => Promise<string>;
    stopBot: () => Promise<void>;
}

export function initTelegram() {
    console.log("[Telegram] 🔧 Initializing...");
    const config = loadConfig();
    
    botToken = process.env.TELEGRAM_BOT_TOKEN || config?.telegramBotToken;
    chatId = process.env.TELEGRAM_CHAT_ID || config?.telegramChatId;
    
    if (botToken && chatId) {
        console.log(`[Telegram] ✅ Notifier Initialized for Chat ID: ${chatId}`);
        sendTelegramMessage("🛡️ <b>HYPE_KING SYSTEM ONLINE</b> 👑\n\nTarget: Top 15 Volume Assets\nStrategy: Chameleon Wick Sniper V3 🦎\nStatus: Monitoring markets... 📡");
    } else {
        console.warn("[Telegram] ⚠️ Token or Chat ID missing in config. Notifications disabled.");
    }
}

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

export async function sendTelegramMessage(text: string, useHtml: boolean = true) {
    if (!botToken || !chatId) return;

    // Truncate to Telegram's max message length
    if (text.length > 4000) {
        text = text.substring(0, 4000) + "\n\n...[TRUNCATED]";
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text,
            parse_mode: useHtml ? "HTML" : undefined
        });
    } catch (err: any) {
        const tgError = err.response?.data?.description || err.message;
        
        // If HTML parsing failed, try sending as plain text
        if (useHtml && err.response?.status === 400) {
            try {
                await axios.post(url, {
                    chat_id: chatId,
                    text: text.replace(/<[^>]*>?/gm, ''), // Strip HTML tags
                    parse_mode: undefined
                });
                return;
            } catch (retryErr: any) {
                const retryTgError = retryErr.response?.data?.description || retryErr.message;
                console.error(`[Telegram] ❌ Fallback failed to send message: ${retryTgError}`);
                return;
            }
        }
        console.error(`[Telegram] ❌ Failed to send message: ${tgError}`);
    }
}

export function startTelegramPolling(control: SultanControl) {
    if (!botToken || !chatId) {
        console.error(`[Telegram] ❌ Cannot start polling: botToken=${botToken ? "SET" : "MISSING"}, chatId=${chatId || "MISSING"}`);
        return;
    }

    console.log("[Telegram] 📡 Interactive Polling Started...");
    
    // Simple polling loop every 7 seconds
    setInterval(async () => {
        try {
            const response = await axios.get(`https://api.telegram.org/bot${botToken}/getUpdates`, {
                params: { offset: lastUpdateId + 1, timeout: 5 }
            });

            const updates = response.data.result;
            for (const update of updates) {
                lastUpdateId = update.update_id;
                const message = update.message;

                if (!message || message.chat.id.toString() !== chatId) continue;
                const text = message.text?.toLowerCase();

                if (text === "/status") {
                    const status = await control.getStatus();
                    await sendTelegramMessage(`📊 <b>HYPE_KING STATUS</b>\n${status}`);
                } else if (text === "/balance") {
                    const status = await control.getStatus();
                    const balLine = status.split("\n")[0]; // Balance is usually first
                    await sendTelegramMessage(`💰 <b>SALDO AKUN</b>\n${balLine}`);
                } else if (text === "/list") {
                    const trades = await control.getOpenTrades();
                    await sendTelegramMessage(`🔭 <b>POSISI AKTIF</b>\n${trades}`);
                } else if (text === "/stop") {
                    await sendTelegramMessage("🚨 <b>EMERGENCY STOP RECEIVED</b>\nStopping HYPE_KING and closing positions...");
                    await control.stopBot();
                } else if (text === "/start") {
                    await sendTelegramMessage("👋 <b>Selamat Datang!</b>\n\nSaya adalah 👑 <b>HYPE_KING Bot</b>, asisten trading pribadi Anda.\n\n<b>Menu Perintah:</b>\n/status - 📊 Cek kesehatan sistem & profit\n/list - 🔭 Lihat posisi yang sedang terbuka\n/balance - 💰 Cek total saldo akun\n/stop - 🚨 Berhenti darurat (Tutup semua posisi)");
                }
            }
        } catch (err: any) {
            // Silently fail to avoid log bloating
        }
    }, 7000);
}
