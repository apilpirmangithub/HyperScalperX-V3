import axios from 'axios';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('C:/Users/apilp/.automaton/automaton.json', 'utf8'));
const botToken = config.telegramBotToken;
const chatId = config.telegramChatId;

console.log("Testing Telegram connectivity...");
console.log("Token:", botToken ? "Found" : "Missing");
console.log("Chat ID:", chatId);

async function test() {
    try {
        const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
        const res = await axios.get(url, { params: { limit: 1 } });
        console.log("Success! Bot is reachable.");
        console.log("Result:", JSON.stringify(res.data, null, 2));
    } catch (err) {
        console.error("Failed:", err.message);
    }
}

test();
