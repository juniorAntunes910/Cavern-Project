"""Monta trailer.html (trailer de lançamento, 30 s, PT-BR) reaproveitando o CSS e o motor de reel.html e os telefones de mobile.css.
Uso: python build-trailer.py"""
import re, pathlib

here = pathlib.Path(__file__).parent
src = (here / 'reel.html').read_text(encoding='utf8')

css = src[src.index('<style>') + 7: src.index('</style>')]
js_util = src[src.index('// ===================== utilitários'): src.index('// ===================== construção')]
js_fx = src[src.index('// ===================== partículas'): src.index('function drawFx(')]

js_util = js_util.replace('const DURATION = 20', 'const DURATION = 30')
js_util = re.sub(r'const HITS = \[[^\]]*\]', 'const HITS = [6.0, 7.5, 9.0, 10.5, 12.0, 13.5, 15.0, 16.5, 18.0, 19.5, 23.0, 27.0]', js_util)

phones_css = (here / 'mobile.css').read_text(encoding='utf8')
trailer_css = (here / 'trailer.css').read_text(encoding='utf8')
body = (here / 'trailer.body.html').read_text(encoding='utf8')
scene_js = (here / 'trailer.scene.js').read_text(encoding='utf8')

out = f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Cavern · Trailer de lançamento</title>
<style>{css}
{phones_css}
{trailer_css}
</style>
</head>
<body>
{body}
<script>
{js_util}
{js_fx}
{scene_js}
</script>
</body>
</html>
"""
(here / 'trailer.html').write_text(out, encoding='utf8')
print('trailer.html', len(out), 'bytes')
