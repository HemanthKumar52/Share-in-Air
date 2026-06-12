import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = process.env.BASE || "http://localhost:3000";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch();

async function shot(name, w, h, prep) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1800);
  if (prep) { try { await prep(p); } catch (e) { console.log(name, "prep err", String(e).slice(0, 80)); } }
  await p.screenshot({ path: `shots/${name}.png` });
  await ctx.close();
  console.log("shot", name);
}

// extremes
await shot("sw-320", 320, 568);
await shot("sw-1920", 1920, 1080);
await shot("sw-land", 740, 360); // mobile landscape

// room modal
const openRoom = async (p) => { await p.getByRole("button", { name: /room/i }).first().click(); await p.waitForTimeout(700); };
await shot("sw-room-390", 390, 844, openRoom);
await shot("sw-room-1280", 1280, 800, openRoom);

// transfers dock
const openDock = async (p) => { await p.getByRole("button", { name: "Transfers" }).click(); await p.waitForTimeout(700); };
await shot("sw-dock-390", 390, 844, openDock);
await shot("sw-dock-1280", 1280, 800, openDock);

await browser.close();
console.log("DONE");
