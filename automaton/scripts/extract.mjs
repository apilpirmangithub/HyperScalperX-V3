import fs from "fs";
try {
    const data = JSON.parse(fs.readFileSync("/root/automaton/optimization_report_mega.json", "utf8"));
    console.log(JSON.stringify(data.best, null, 2));
} catch (e) {
    console.error(e.message);
}
