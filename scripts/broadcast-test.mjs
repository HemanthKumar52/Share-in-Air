// End-to-end test of the presenter/broadcast model with a FAKE camera (same
// code path as screen share, but headless-automatable). A presents -> B sees
// LIVE -> B taps Watch -> B receives the live stream (viewer opens).
import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = process.env.BASE || "http://localhost:3949";
mkdirSync("shots", { recursive: true });

const browser = await chromium.launch({
  args: [
    "--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
  ],
});

const ctxA = await browser.newContext({ viewport: { width: 430, height: 900 } });
const ctxB = await browser.newContext({ viewport: { width: 430, height: 900 } });
const a = await ctxA.newPage();
const b = await ctxB.newPage();
a.on("console", (m) => { if (m.type() === "error") console.log("A.err:", m.text().slice(0, 120)); });
b.on("console", (m) => { if (m.type() === "error") console.log("B.err:", m.text().slice(0, 120)); });

await a.goto(BASE, { waitUntil: "load" });
await b.goto(BASE, { waitUntil: "load" });

const peerSel = 'button[aria-label^="Share with"]';
try {
  await a.waitForSelector(peerSel, { timeout: 25000 });
  await b.waitForSelector(peerSel, { timeout: 8000 });
  console.log("discovery: OK (both see a peer)");
} catch {
  console.log("discovery: FAILED");
}

// A presents the camera (no pairing).
await a.getByRole("button", { name: "Camera" }).click();
await a.waitForTimeout(2500);
const aHasPreview = (await a.locator("video").count()) > 0;
console.log("A presenting (preview video present):", aHasPreview);
await a.screenshot({ path: "shots/bcast-A-presenting.png" });

// B should now see A as LIVE; open the peer sheet and tap Watch.
let bWatching = false;
try {
  await b.waitForTimeout(2500); // let presence propagate
  await b.locator(peerSel).first().click({ force: true });
  await b.waitForTimeout(700);
  await b.screenshot({ path: "shots/bcast-B-sheet.png" });
  // click the "presenting" banner / Watch
  const watchBtn = b.locator('button:has-text("presenting")').first();
  if (await watchBtn.count()) {
    await watchBtn.click({ force: true });
  } else {
    await b.getByText("Watch", { exact: false }).first().click({ force: true });
  }
  // viewer (ScreenStage) shows a <video> on B once the stream arrives
  await b.waitForSelector("video", { timeout: 12000 });
  await b.waitForTimeout(1500);
  bWatching = (await b.locator("video").count()) > 0;
} catch (e) {
  console.log("watch flow error:", String(e).slice(0, 120));
}
await b.screenshot({ path: "shots/bcast-B-watching.png" });
console.log("B watching (viewer video present):", bWatching);

// A's presenter bar should now report a watcher.
await a.waitForTimeout(1500);
await a.screenshot({ path: "shots/bcast-A-watched.png" });

await browser.close();
console.log(aHasPreview && bWatching ? "BROADCAST_OK" : "BROADCAST_INCOMPLETE");
