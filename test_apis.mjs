import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const envMap = {};
envContent.split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) envMap[match[1].trim()] = match[2].trim();
});

const KEY  = envMap["RAPIDAPI_KEY"];
const HOST = envMap["SPORTAPI_HOST"];

const HEADERS = {
  "Content-Type": "application/json",
  "x-rapidapi-key": KEY,
  "x-rapidapi-host": HOST,
};

async function get(path) {
  const res = await fetch(`https://${HOST}${path}`, { headers: HEADERS });
  const data = await res.json();
  return { status: res.status, data };
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// --- Test key endpoints ---
const today = new Date().toISOString().split("T")[0]; // 2026-04-21

console.log("🔍 Explorando endpoints de SportAPI...\n");

// 1. Eventos de fútbol de hoy
const r1 = await get(`/api/v1/sport/football/scheduled-events/${today}`);
console.log(`[${r1.status}] /sport/football/scheduled-events → ${JSON.stringify(r1.data).slice(0, 200)}`);
await sleep(300);

// 2. Eventos de fútbol EN VIVO
const r2 = await get(`/api/v1/sport/football/events/live`);
console.log(`\n[${r2.status}] /sport/football/events/live → ${JSON.stringify(r2.data).slice(0, 200)}`);
await sleep(300);

// 3. Categorías disponibles (qué deportes tiene cubiertos)
const r3 = await get(`/api/v1/sport/football/categories`);
console.log(`\n[${r3.status}] /sport/football/categories → ${JSON.stringify(r3.data).slice(0, 200)}`);
await sleep(300);

// 4. Buscar torneo (Champions League)
const r4 = await get(`/api/v1/search/all?q=Champions+League`);
console.log(`\n[${r4.status}] /search/all Champions League → ${JSON.stringify(r4.data).slice(0, 200)}`);
