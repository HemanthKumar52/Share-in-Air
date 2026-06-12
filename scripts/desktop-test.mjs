// Inspect desktop/web layout — empty, with a peer, and while presenting — to
// catch any element overlap at wide viewports.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3957";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch({
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});

// Empty desktop sizes
for (const [name, w, h] of [["d-1280", 1280, 800], ["d-1536", 1536, 864], ["d-1024", 1024, 700]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `shots/${name}-empty.png` });
  await ctx.close();
}

// Two peers on desktop: discover, then present -> capture overlap
const ctxA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();
await a.goto(BASE, { waitUntil: "load" });
await b.goto(BASE, { waitUntil: "load" });
const peerSel = 'button[aria-label^="Share with"]';
try { await a.waitForSelector(peerSel, { timeout: 25000 }); await b.waitForSelector(peerSel, { timeout: 8000 }); } catch {}

await a.screenshot({ path: "shots/d-1280-peer.png" });

// A presents camera -> screenshot A (presenting state on desktop)
await a.getByRole("button", { name: "Camera" }).click();
await a.waitForTimeout(2500);
await a.screenshot({ path: "shots/d-1280-presenting.png" });

// scroll a bit to check sticky behaviour
await a.evaluate(() => window.scrollBy(0, 200));
await a.waitForTimeout(500);
await a.screenshot({ path: "shots/d-1280-presenting-scrolled.png" });

await browser.close();
console.log("DONE");
