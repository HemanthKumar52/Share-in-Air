// Proves cross-device discovery works through the public relay (MQTT), NOT via
// same-browser BroadcastChannel: two ISOLATED contexts must find each other.
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3945";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch();
const ctxA = await browser.newContext({ viewport: { width: 420, height: 860 } });
const ctxB = await browser.newContext({ viewport: { width: 420, height: 860 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();

await a.goto(BASE, { waitUntil: "load" });
await b.goto(BASE, { waitUntil: "load" });

const sel = 'button[aria-label^="Share with"]';
let aSees = false;
let bSees = false;
try {
  await a.waitForSelector(sel, { timeout: 25000 });
  aSees = true;
} catch {}
try {
  await b.waitForSelector(sel, { timeout: 5000 });
  bSees = true;
} catch {}

await a.waitForTimeout(1500);
await a.screenshot({ path: "shots/relay-A.png" });
await b.screenshot({ path: "shots/relay-B.png" });

console.log("A sees a peer via relay:", aSees);
console.log("B sees a peer via relay:", bSees);

// If discovered, open the sheet on A and confirm the share actions render.
if (aSees) {
  try {
    await a.locator(sel).first().click({ force: true, timeout: 4000 });
    await a.waitForTimeout(800);
    await a.screenshot({ path: "shots/relay-A-sheet.png" });
    console.log("opened share sheet on A");
  } catch (e) {
    console.log("sheet open failed:", String(e).slice(0, 80));
  }
}

await browser.close();
console.log(aSees && bSees ? "RELAY_OK" : "RELAY_INCOMPLETE");
