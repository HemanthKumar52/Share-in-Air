import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = process.env.BASE || "http://localhost:3000";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch();
for (const [name, w, h] of [["seo-390", 390, 844], ["seo-1280", 1280, 800]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `shots/${name}-full.png`, fullPage: true });
  await ctx.close();
}
await browser.close();
console.log("DONE");
