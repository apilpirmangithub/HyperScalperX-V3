/**
 * Firebase Realtime Database Pusher
 * Syncs bot stats to Firebase for the Web Dashboard.
 */

import admin from "firebase-admin";
import { AutomatonDatabase } from "../types.js";
import { Exchange } from "./exchange.js";

import fs from "fs";

let isInitialized = false;

export function initFirebasePusher(serviceAccountPath: string, databaseURL: string) {
    try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: databaseURL
        });
        isInitialized = true;
        console.log("[Firebase] 🔥 Pusher Initialized.");
    } catch (err) {
        console.error("[Firebase] ❌ Failed to initialize:", err);
    }
}

export async function pushStatsToFirebase(db: AutomatonDatabase, exchange: Exchange) {
    if (!isInitialized) return;

    try {
        const bal = await exchange.getBalance();
        const stats = db.getTradeStats();
        const positions = await exchange.getOpenPositions();
        const recentActivities = db.getRecentActivities(10);

        const livePositions = await Promise.all(positions.map(async p => {
            const mid = await exchange.getMidPrice(p.asset);
            const pnl = ((mid - p.entryPrice) / p.entryPrice * 100) * (p.side === "LONG" ? 1 : -1);
            return {
                asset: p.asset,
                side: p.side,
                size: p.size,
                entry: p.entryPrice,
                pnl: pnl
            };
        }));

        const data = {
            equity: bal.totalValue,
            totalPnl: stats.totalPnlUsdc,
            winRate: stats.winrate,
            positions: livePositions,
            recentActivities: recentActivities,
            lastUpdate: new Date().toISOString()
        };

        await admin.database().ref('trading_stats').set(data);
    } catch (err) {
        console.error("[Firebase] ❌ Failed to push data:", err);
    }
}

export function startFirebaseSync(db: AutomatonDatabase, exchange: Exchange, intervalMs: number = 30000) {
    if (!isInitialized) return;
    
    // Initial push
    pushStatsToFirebase(db, exchange);

    // Periodic sync
    setInterval(() => {
        pushStatsToFirebase(db, exchange);
    }, intervalMs);
}
