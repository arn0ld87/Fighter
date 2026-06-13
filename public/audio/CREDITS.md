# Audio Credits

The shipped sound layer is **procedurally synthesized** at runtime via the Web Audio
API (`src/audio/synth.ts`) — no third-party audio is required and there is no license
obligation. The SoundManager additionally prefers any real sample present in this
folder (run `node scripts/fetch-audio.mjs` to fetch them).

## Fetched CC0 samples

- `whoosh.mp3` — CC0, source: OpenGameArt.org (https://opengameart.org/sites/default/files/swishprev.mp3)
- `ui_click.ogg` — CC0, source: OpenGameArt.org (https://opengameart.org/sites/default/files/beep.ogg)

All fetched samples are CC0 / public-domain (no attribution required).
