# Cavern — motion showreel (source)

20 s · 1920×1080 · 60 fps. Every frame is a pure function of time (`render(t)` in `reel.html`), so the render is deterministic.

- `reel.html` — the motion piece (HTML + CSS 3D + canvas). Open `reel.html?play` in Chrome/Edge for a real-time preview.
- `audio.mjs` — the soundtrack, synthesized from scratch (no samples): `node audio.mjs soundtrack.wav`.
- `capture-screens.mjs` — seeds demo data in a separate headless browser and captures the real app screens into `shots/` (the app's dev server must be running; your own data is not touched). The AI reply in the advisor shot is a simulated response.
- `render-frames.mjs` — renders the frames: `node render-frames.mjs reel.html frames all 0 1200`.

Both `.mjs` scripts import Playwright, so copy them into `web/scripts/` and run from `web/`. Encode with ffmpeg:

    ffmpeg -framerate 60 -i frames/f%04d.jpg -i soundtrack.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest cavern-showreel.mp4
