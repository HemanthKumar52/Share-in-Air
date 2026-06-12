// Inspect mobile responsiveness + the received-item preview experience.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3951";
mkdirSync("shots", { recursive: true });

// A visibly-sized SVG "photo" so the preview is actually visible in screenshots.
const PHOTO = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF9D4D"/><stop offset="1" stop-color="#FF4D3D"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="320" cy="200" r="90" fill="#fff" opacity="0.92"/><text x="320" y="360" font-family="sans-serif" font-size="48" font-weight="700" text-anchor="middle" fill="#1a0d04">Sunset</text></svg>`,
);

const browser = await chromium.launch({
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});

// Empty-state mobile sizes
for (const [name, w, h] of [["m-320", 320, 568], ["m-360", 360, 740], ["m-390", 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `shots/${name}.png` });
  await ctx.close();
}

// Two phones: discover, present, send a photo
const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 } });
const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();
await a.goto(BASE, { waitUntil: "load" });
await b.goto(BASE, { waitUntil: "load" });
const peerSel = 'button[aria-label^="Share with"]';
try { await a.waitForSelector(peerSel, { timeout: 25000 }); await b.waitForSelector(peerSel, { timeout: 8000 }); } catch {}

// A presents camera -> screenshot A (check presenting bar overlap on mobile)
await a.getByRole("button", { name: "Camera" }).click();
await a.waitForTimeout(2500);
await a.screenshot({ path: "shots/m-presenting-A.png" });
// stop presenting to free things up
try { await a.getByRole("button", { name: "Stop" }).click(); await a.waitForTimeout(800); } catch {}

// A sends a photo to B
try {
  await a.locator(peerSel).first().click({ force: true });
  await a.waitForTimeout(700);
  await a.locator('input[type=file]').setInputFiles({ name: "sunset.svg", mimeType: "image/svg+xml", buffer: PHOTO });
  await a.waitForTimeout(2000);
} catch (e) { console.log("send err", String(e).slice(0, 100)); }

// What does B see right after receiving (no dock opened)?
await b.waitForTimeout(800);
await b.screenshot({ path: "shots/m-recv-B-default.png" });

// Open B's transfers dock
try {
  await b.getByRole("button", { name: "Transfers" }).click();
  await b.waitForTimeout(900);
  await b.screenshot({ path: "shots/m-recv-B-dock.png" });
} catch (e) { console.log("dock err", String(e).slice(0, 100)); }

await browser.close();
console.log("DONE");
