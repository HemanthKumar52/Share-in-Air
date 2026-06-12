import { chromium } from "playwright";
import { mkdirSync } from "fs";
const BASE = process.env.BASE || "http://localhost:3961";
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({
  args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"],
});
const peerSel = 'button[aria-label^="Share with"]';

// 320 share sheet (two contexts so a peer exists)
{
  const ctxA = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const ctxB = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  await a.goto(BASE, { waitUntil: "load" });
  await b.goto(BASE, { waitUntil: "load" });
  try { await a.waitForSelector(peerSel, { timeout: 25000 }); } catch {}
  try { await a.locator(peerSel).first().click({ force: true }); await a.waitForTimeout(900); } catch {}
  await a.screenshot({ path: "shots/fix-sheet-320.png" });
  await ctxA.close(); await ctxB.close();
}

// 320 room modal (create room to show the code)
{
  const c = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const p = await c.newPage();
  await p.goto(BASE, { waitUntil: "load" });
  await p.waitForTimeout(1500);
  try { await p.getByRole("button", { name: /room/i }).first().click(); await p.waitForTimeout(600); } catch {}
  try { await p.getByRole("button", { name: /create a room/i }).click(); await p.waitForTimeout(900); } catch {}
  await p.screenshot({ path: "shots/fix-room-320.png" });
  await c.close();
}

// 320 presenting bar
{
  const d = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const q = await d.newPage();
  await q.goto(BASE, { waitUntil: "load" });
  await q.waitForTimeout(1500);
  try { await q.getByRole("button", { name: "Camera" }).click(); await q.waitForTimeout(2500); } catch {}
  await q.screenshot({ path: "shots/fix-presenting-320.png" });
  await d.close();
}

await browser.close();
console.log("DONE");
