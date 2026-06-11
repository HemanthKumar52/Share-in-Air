// Visual responsiveness harness: render the app at many viewports and screenshot.
// Two pages in one browser context discover each other via BroadcastChannel, so
// we can also capture the radar-with-peer and the share sheet.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3939";
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("shot", name);
}

// 1) Empty-state across sizes (single page each)
const sizes = [
  ["empty-320", 320, 568],
  ["empty-360", 360, 740],
  ["empty-390", 390, 844],
  ["empty-768", 768, 1024],
  ["empty-1024", 1024, 768],
  ["empty-1280", 1280, 800],
  ["empty-1536", 1536, 960],
];
for (const [name, width, height] of sizes) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(1800);
  await shot(page, name);
  await ctx.close();
}

// 2) Radar-with-peer + share sheet (two pages, same context)
const peerSizes = [
  ["peer-390", 390, 844],
  ["peer-768", 768, 1024],
  ["peer-1280", 1280, 800],
];
for (const [name, width, height] of peerSizes) {
  try {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const p1 = await ctx.newPage();
    await p1.goto(BASE, { waitUntil: "load" });
    const p2 = await ctx.newPage();
    await p2.goto(BASE, { waitUntil: "load" });
    await p1.bringToFront();
    try {
      await p1.waitForSelector('button[aria-label^="Share with"]', { timeout: 9000 });
    } catch {
      console.log("no peer appeared for", name);
    }
    await p1.waitForTimeout(1400);
    await shot(p1, `${name}-radar`);
    const peer = p1.locator('button[aria-label^="Share with"]').first();
    if (await peer.count()) {
      try {
        await peer.click({ force: true, timeout: 4000 });
        await p1.waitForTimeout(900);
        await shot(p1, `${name}-sheet`);
      } catch (e) {
        console.log("sheet click failed for", name, String(e).slice(0, 80));
      }
    }
    await ctx.close();
  } catch (e) {
    console.log("scenario failed", name, String(e).slice(0, 100));
  }
}

// 3) Room modal (mobile)
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  try {
    await page.getByRole("button", { name: /room/i }).first().click({ timeout: 3000 });
    await page.waitForTimeout(700);
    await shot(page, "room-390");
  } catch {
    console.log("room button not found");
  }
  await ctx.close();
}

await browser.close();
console.log("DONE");
