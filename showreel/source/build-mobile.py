"""Monta reel-mobile.html (EN) e reel-mobile-pt.html (PT-BR) reaproveitando o CSS e o motor (utilitários, partículas, fundo) de reel.html.
Uso: python build-mobile.py   (gera reel-mobile.html ao lado de reel.html)"""
import re, pathlib

here = pathlib.Path(__file__).parent
src = (here / 'reel.html').read_text(encoding='utf8')

css = src[src.index('<style>') + 7: src.index('</style>')]
js_util = src[src.index('// ===================== utilitários'): src.index('// ===================== construção')]
js_fx = src[src.index('// ===================== partículas'): src.index('function drawFx(')]

js_util = js_util.replace('const DURATION = 20', 'const DURATION = 30')
js_util = re.sub(r'const HITS = \[[^\]]*\]', 'const HITS = [1.0, 3.0, 5.0, 7.0, 9.0, 11.0, 13.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0]', js_util)

extra_css = (here / 'mobile.css').read_text(encoding='utf8')
body = (here / 'mobile.body.html').read_text(encoding='utf8')
scene_js = (here / 'mobile.scene.js').read_text(encoding='utf8')
extra_js = (here / 'mobile.extra.js').read_text(encoding='utf8')
scene_js = scene_js.replace('function render(t) {', extra_js + '\nfunction render(t) {', 1)

def build(lang):
    js = scene_js
    if lang == "pt":
        js = js.replace("window.render = render", pt_js + "\nwindow.render = render", 1)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Cavern Mobile Reel</title>
<style>{css}
{extra_css}
</style>
</head>
<body>
{body}
<script>
{js_util}
{js_fx}
{js}
</script>
</body>
</html>
"""

pt_js = (here / 'mobile.pt.js').read_text(encoding='utf8')
for lang, name in (('en', 'reel-mobile.html'), ('pt', 'reel-mobile-pt.html')):
    out = build(lang)
    (here / name).write_text(out, encoding='utf8')
    print(name, len(out), 'bytes')
