// Load a live URL, capture console + page errors + failed requests, screenshot.
import { chromium } from "playwright-core";

const URL = process.env.URL || "http://localhost:3000/";
const browser = await chromium.launch({
  executablePath: process.env.PW_EXE,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const logs = [];
page.on("console", (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on("pageerror", (e) => logs.push(`[PAGEERROR] ${e.stack || e.message}`));
page.on("requestfailed", (r) => logs.push(`[REQFAIL] ${r.url()} — ${r.failure()?.errorText}`));
page.on("response", (r) => { if (r.status() >= 400) logs.push(`[HTTP ${r.status()}] ${r.url()}`); });

await page.goto(URL, { waitUntil: "networkidle", timeout: 30000 }).catch((e) => logs.push("[GOTO] " + e.message));
await page.waitForTimeout(2500);
await page.screenshot({ path: "/tmp/probe.png" });

const dom = await page.evaluate(() => {
  const root = document.getElementById("root") || document.body;
  return {
    rootChildren: root ? root.childElementCount : -1,
    bodyText: (document.body.innerText || "").slice(0, 200),
    hasCanvas: !!document.querySelector("canvas"),
  };
}).catch((e) => ({ err: String(e) }));

console.log("URL " + URL);
console.log("DOM " + JSON.stringify(dom));
console.log("LOGS:\n" + (logs.length ? logs.join("\n") : "(none)"));
await browser.close();
