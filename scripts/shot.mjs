// Headless smoke test: serve dist/, load the app, render WebGL frames, screenshot.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { chromium } from "playwright-core";

const DIST = join(process.cwd(), "dist");
const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p === "/") p = "/index.html";
    let file = join(DIST, p);
    let data;
    try { data = await readFile(file); }
    catch { file = join(DIST, "index.html"); data = await readFile(file); }
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (e) { res.writeHead(500); res.end(String(e)); }
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://localhost:${port}/`;

const browser = await chromium.launch({
  executablePath: process.env.PW_EXE,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

await page.goto(url, { waitUntil: "load", timeout: 30000 }).catch((e) => errors.push("GOTO: " + e.message));
await page.waitForTimeout(4000); // let the RAF loop render several frames
await page.screenshot({ path: "/tmp/fighter-shot.png" });

const info = await page.evaluate(() => {
  const c = document.querySelector("canvas");
  if (!c) return { canvas: false };
  const gl = c.getContext("webgl2") || c.getContext("webgl");
  return { canvas: true, w: c.width, h: c.height, gl: !!gl };
}).catch((e) => ({ err: String(e) }));

console.log("CANVAS_INFO " + JSON.stringify(info));
console.log("CONSOLE_ERRORS " + JSON.stringify(errors.slice(0, 15)));
await browser.close();
server.close();
