#!/usr/bin/env node
/**
 * Optional CC0 sample fetcher.
 *
 * The game ships with a fully procedural Web-Audio sound layer (src/audio/synth.ts),
 * so this script is OPTIONAL. Run it to pull real CC0 / public-domain samples into
 * public/audio/ — the SoundManager prefers any present sample over synthesis.
 *
 *   node scripts/fetch-audio.mjs
 *
 * Every download is hard-validated by magic bytes so HTML error pages never get
 * saved as audio. Failures are non-fatal (synthesis stays active for that key).
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "audio");

// Curated, semantically-sensible CC0 candidates (first valid per key wins).
// Mismatched manifest entries (e.g. a "magic spell" proposed for the gong) are
// deliberately omitted — synthesis handles those better.
const SOURCES = {
  light_hit: [
    { url: "https://opengameart.org/sites/default/files/hit.mp3", license: "CC0", source: "OpenGameArt.org" },
  ],
  whoosh: [
    { url: "https://opengameart.org/sites/default/files/swishprev.mp3", license: "CC0", source: "OpenGameArt.org" },
    { url: "https://opengameart.org/sites/default/files/prevsq.mp3", license: "CC0", source: "OpenGameArt.org" },
  ],
  ui_click: [
    { url: "https://opengameart.org/sites/default/files/bep.mp3", license: "CC0", source: "OpenGameArt.org" },
    { url: "https://opengameart.org/sites/default/files/beep.ogg", license: "CC0", source: "OpenGameArt.org" },
  ],
};

// SFX must be SHORT. A multi-hundred-KB "hit" is a mislabelled long clip — reject
// it so it never overrides the punchy synthesized fallback.
const MAX_SFX_BYTES = 120 * 1024;

function extOf(url) {
  const m = url.toLowerCase().match(/\.(mp3|ogg|wav)(\?|$)/);
  return m ? m[1] : null;
}

/** Validate audio by container magic bytes. */
function looksLikeAudio(buf, ext) {
  if (buf.length < 1024) return false;
  const ascii = (n) => buf.slice(0, n).toString("ascii");
  if (ext === "ogg") return ascii(4) === "OggS";
  if (ext === "wav") return ascii(4) === "RIFF";
  if (ext === "mp3") {
    if (ascii(3) === "ID3") return true;
    return buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0; // MPEG frame sync
  }
  return false;
}

async function tryFetch(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const credited = [];
  let ok = 0;
  let skipped = 0;

  for (const [key, candidates] of Object.entries(SOURCES)) {
    let saved = false;
    for (const c of candidates) {
      const ext = extOf(c.url);
      if (!ext) continue;
      const buf = await tryFetch(c.url);
      if (!buf || !looksLikeAudio(buf, ext)) {
        console.log(`  · ${key}: candidate failed validation (${c.url})`);
        continue;
      }
      if (buf.length > MAX_SFX_BYTES) {
        console.log(`  · ${key}: rejected — ${(buf.length / 1024).toFixed(0)} KB too long for an SFX (${c.url})`);
        continue;
      }
      const file = join(OUT, `${key}.${ext}`);
      await writeFile(file, buf);
      console.log(`  ✓ ${key}.${ext} (${(buf.length / 1024).toFixed(0) } KB) ← ${c.url}`);
      credited.push({ key, ext, ...c, bytes: buf.length });
      saved = true;
      ok++;
      break;
    }
    if (!saved) {
      console.log(`  ✗ ${key}: no valid sample — synthesis will be used`);
      skipped++;
    }
  }

  const credits = [
    "# Audio Credits",
    "",
    "The shipped sound layer is **procedurally synthesized** at runtime via the Web Audio",
    "API (`src/audio/synth.ts`) — no third-party audio is required and there is no license",
    "obligation. The SoundManager additionally prefers any real sample present in this",
    "folder (run `node scripts/fetch-audio.mjs` to fetch them).",
    "",
    "## Fetched CC0 samples",
    "",
    credited.length
      ? credited.map((c) => `- \`${c.key}.${c.ext}\` — ${c.license}, source: ${c.source} (${c.url})`).join("\n")
      : "_None fetched in the last run — all sounds are currently synthesized._",
    "",
    "All fetched samples are CC0 / public-domain (no attribution required).",
    "",
  ].join("\n");
  await writeFile(join(OUT, "CREDITS.md"), credits);

  console.log(`\nDone. ${ok} sample(s) saved, ${skipped} synthesized. CREDITS.md written.`);
}

main().catch((e) => {
  console.error("fetch-audio failed:", e);
  process.exit(0); // optional step — never fail the build
});
