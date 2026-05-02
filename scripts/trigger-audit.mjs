import { execSync } from "child_process";

try {
    console.log("Injecting wake_request...");
    const cmd = `node packages/cli/build/index.js sandbox exec d2d07903f3caa0fdc68eef1acdbc4a9a "sqlite3 /root/.automaton/state.db \\"INSERT OR REPLACE INTO kv (key, value) VALUES ('wake_request', '[AUDIT_TRIGGER]');\\""`;
    const output = execSync(cmd, { stdio: 'inherit', env: process.env });
    console.log("Done.");
} catch (err) {
    console.error(err.message);
}
