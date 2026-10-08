# Cavern — motion showreel (source)

20 s · 1920×1080 · 60 fps. Every frame is a pure function of time (`render(t)` in `reel.html`), so the render is deterministic.

- `reel.html` — the motion piece (HTML + CSS 3D + canvas). Open `reel.html?play` in Chrome/Edge for a real-time preview.
- `audio.mjs` — the soundtrack, synthesized from scratch (no samples): `node audio.mjs soundtrack.wav`.
- `capture-screens.mjs` — seeds demo data in a separate headless browser and captures the real app screens into `shots/` (the app's dev server must be running; your own data is not touched). The AI reply in the advisor shot is a simulated response.
- `render-frames.mjs` — renders the frames: `node render-frames.mjs reel.html frames all 0 1200`.

Both `.mjs` scripts import Playwright, so copy them into `web/scripts/` and run from `web/`. Encode with ffmpeg:

    ffmpeg -framerate 60 -i frames/f%04d.jpg -i soundtrack.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest cavern-showreel.mp4

## Mobile reel (30 s)

Segunda peça, de 30 s, focada no app no celular: mesmo motor do showreel, cenas e trilha novas.

- `reel-mobile.html` (inglês) e `reel-mobile-pt.html` (PT-BR) — gerados por `python build-mobile.py` a partir de `reel.html` (CSS e motor reaproveitados), `mobile.css`, `mobile.body.html` e `mobile.scene.js`. Edite os arquivos `mobile.*`, não os `.html` gerados. Os textos em português ficam em `mobile.pt.js` (um mapa id → texto); a trilha é só música, então o áudio é o mesmo nas duas versões. Abra `reel-mobile.html?play` para pré-visualizar.
- `audio-mobile.mjs` — trilha de 30 s, sintetizada: `node audio-mobile.mjs soundtrack-mobile.wav`.
- `capture-mobile.mjs` — semeia dados de demonstração e captura as telas reais em 390×844 @3x (`shots/mm-*.png`). O servidor de desenvolvimento precisa estar rodando (`BASE=http://127.0.0.1:5173` por padrão).
- Os toques, o menu e a loja são sobrepostos às capturas reais em coordenadas da imagem (1170×2532); o bate-papo é HTML dentro do telefone, com a resposta da IA simulada.

Renderização (a partir de `web/`, copiando `render-frames.mjs` para `web/scripts/`):

    node scripts/render-frames.mjs ../showreel/source/reel-mobile.html frames ... 0 1800
    ffmpeg -framerate 60 -i frames/f%04d.jpg -i soundtrack-mobile.wav -c:v libx264 -preset slow -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart -shortest cavern-mobile-reel.mp4

Para pré-visualizar quadros avulsos: `STILLS=2.4,4.4,9.9 node scripts/render-frames.mjs reel-mobile.html out stills`.
