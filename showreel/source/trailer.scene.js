// ===================== trailer de lançamento (30 s) =====================
// 0–6 tensão · 6 ignição + logo · 7,5–19,5 oito cortes de funções (1,5 s = 3 tempos a 120 BPM) · 19,5–23 respiro · 23–27 clímax · 27–30 cartela.
const place = (id, cx, cy, transform) => set(id, { left: `${cx - 190}px`, top: `${cy - 395}px`, transform })
function scrollImg(scroller, p) {
  const img = scroller.querySelector('img')
  const h = img.naturalHeight * 352 / (img.naturalWidth || 1)
  scroller.style.transform = `translateY(${-Math.max(0, h - 762) * p}px)`
}
const maskLetters = (id, text) => { $(id).innerHTML = [...text].map(c => `<span class="mask"><span>${c}</span></span>`).join('') }
const phone = (id, shot, extra = '') => `<div class="mphone" id="${id}"><div class="notch"></div><div class="glass"><div class="screen"><div class="scroller" id="${id}-s"><img src="shots/${shot}.png">${extra}</div></div><div class="sheen"></div></div></div>`
const sheenSweep = (id, t, a) => { $(id).querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, a, a + .8))}%)` }
const pad2 = n => String(n).padStart(2, '0')
maskLetters('logo-word', 'CAVERN')

// ---- oito cortes ----
const CUT0 = 7.5, CUT = 1.5
const cuts = [
  ['mm-home', 'Hábitos', 'MARQUE', 'Um toque e o dia avança.', 0],
  ['mm-focus', 'Foco', 'FOQUE', 'Sessões que viram histórico.', 0],
  ['mm-gym', 'Academia', 'EVOLUA', 'Cada treino vira gráfico.', 0],
  ['mm-chat', 'Assistente IA', 'CONVERSE', 'Com os seus dados, do seu jeito.', 0],
  ['mm-ach-full', 'Conquistas', 'CONQUISTE', '18 marcos para desbloquear.', .14],
  ['mm-shop', 'Loja', 'PERSONALIZE', 'Mascote, fogueira e estilo.', 0],
  ['mm-finance-full', 'Finanças', 'ORGANIZE', 'Saldo, metas e Bitcoin.', .05],
  ['mm-checkins-full', 'Check-in', 'REFLITA', 'Como foi o seu dia?', .2],
]
// toque no primeiro hábito (coordenadas da captura 1170×2532)
const tapOverlay = '<div class="ov"><div class="done-chk" id="c0k" style="left:127px;top:1297px;width:72px;height:72px">✓</div><div class="done-btn" id="c0b" style="left:804px;top:1268px;width:246px;height:131px">Desfazer</div><div class="rip" id="c0r" style="left:927px;top:1333px"></div></div>'
$('cuts').innerHTML = cuts.map(([shot, kicker, word, sub], i) => {
  const right = i % 2 === 0, x = right ? 140 : 1060
  return `<section class="cut" id="cut${i}">
    <div class="cn" id="cn${i}" style="left:${x}px;top:250px">${pad2(i + 1)} / 08</div>
    <div class="ck" id="ck${i}" style="left:${x}px;top:300px">${kicker}</div>
    <div class="cw" id="cw${i}" style="left:${x}px;top:350px;font-size:230px">${word}<b>.</b></div>
    <div class="cs" id="cs${i}" style="left:${x}px;top:600px">${sub}</div>
    ${phone('cp' + i, shot, i === 0 ? tapOverlay : '')}
  </section>`
}).join('')
// a palavra grande cabe em 800 px: palavras longas ("PERSONALIZE.") ganham fonte menor
cuts.forEach((_, i) => {
  const el = $('cw' + i); let size = 230
  while (el.scrollWidth > 800 && size > 100) { size -= 6; el.style.fontSize = `${size}px` }
  $('cs' + i).style.top = `${350 + size * .92 + 40}px`
})

// ---- parede de telas ----
const wallShots = ['mm-home', 'mm-gym', 'mm-shop', 'mm-focus', 'mm-chat', 'mm-home-light', 'mm-ach-full', 'mm-cavern-full', 'mm-checkins-full', 'mm-shop-light']
$('tw-wall').innerHTML = wallShots.map((s, k) => phone('wp' + k, s)).join('')
wallShots.forEach((_, k) => { const c = k % 5, r = Math.floor(k / 5); place('wp' + k, (c - 2) * 430, (r - .5) * 860, 'scale(.95)') })

document.querySelectorAll('.mphone').forEach(p => p.querySelector('.glass').appendChild(p.querySelector('.sheen')))

// ---- efeitos ----
function drawFx(t, frame) {
  fx.clearRect(0, 0, 1920, 1080)
  for (const [h, cx, cy] of [[6.0, 960, 320], [27.0, 960, 260]]) {
    const st = t - h
    if (st > 0 && st < 1.4) {
      const r = rng(h * 100)
      for (let i = 0; i < 110; i++) {
        const a = r() * Math.PI * 2, v = 300 + r() * 1000, x = cx + Math.cos(a) * v * st, y = cy + Math.sin(a) * v * st + 600 * st * st
        fx.globalAlpha = clamp(1 - st / 1.4) * (.5 + r() * .5); const s = 6 + r() * 16
        fx.globalCompositeOperation = 'lighter'; fx.drawImage(r() < .5 ? sprGold : sprEmber, x - s, y - s, s * 2, s * 2)
      }
      fx.globalCompositeOperation = 'source-over'
    }
  }
  fx.globalAlpha = 1
  // vinheta mais fechada na abertura (clima de trailer)
  const dark = t < 6 ? .9 : .72
  const v = fx.createRadialGradient(960, 540, 380, 960, 540, 1150)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${dark})`)
  fx.fillStyle = v; fx.fillRect(0, 0, 1920, 1080)
  fx.globalAlpha = .06; fx.globalCompositeOperation = 'overlay'
  fx.drawImage(grains[frame % grains.length], 0, 0, 1920, 1080)
  fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over'
}

// ===================== cenas =====================
const scenes = [['t-intro', 0, 6.05], ['t-logo', 5.98, 7.6], ...cuts.map((_, i) => [`cut${i}`, CUT0 + i * CUT - .05, CUT0 + (i + 1) * CUT + .05]), ['t-wall', 19.45, 23.15], ['t-peak', 23.0, 27.05], ['t-end', 26.98, 30]]
function envelope(el, t, a, b, fast) {
  const inD = fast ? .16 : .35, outD = fast ? .14 : .3
  const inP = tw(t, a, a + inD, E.outExpo), outP = tw(t, b - outD, b, E.inExpo)
  set(el, { opacity: (inP * (1 - outP)).toFixed(3), transform: `scale(${lerp(1.06, 1, inP) * lerp(1, 1.14, outP)})`, filter: `blur(${(1 - inP) * 12 + outP * 16}px)` })
}
const line = (id, t, a, b, glitch = false) => {
  const inP = tw(t, a, a + .35, E.outCubic), outP = tw(t, b - .3, b, E.inCubic), on = t >= a && t <= b
  const jitter = glitch && t - a < .25 ? noise1(t * 60, a) * 14 : 0
  set(id, { opacity: on ? (inP * (1 - outP)).toFixed(3) : 0, filter: `blur(${(1 - inP) * 10 + outP * 8}px)`, transform: `translateY(-50%) translateX(${jitter}px) scale(${lerp(1.05, 1, inP)})`, textShadow: glitch && t - a < .2 ? '6px 0 rgba(255,60,90,.6), -6px 0 rgba(60,200,255,.6)' : 'none' })
}
const flameWobble = (id, t, s) => set(id, { transform: `scale(${s}) scaleY(${1 + noise1(t * 6) * .07}) skewX(${noise1(t * 5) * 4}deg)`, filter: `drop-shadow(0 0 ${50 + Math.sin(t * 8) * 10}px rgba(255,140,60,.85))` })

function render(t) {
  const frame = Math.round(t * FPS)
  const hit = hitAmount(t)
  set('stage', { transform: `translate(${noise1(t * 40, 1) * hit * 14}px, ${noise1(t * 40, 5) * hit * 10}px)` })
  set('flash', { opacity: (Math.max(...[6.0, 27.0].map(h => t >= h ? Math.exp(-(t - h) * 9) : 0)) * .55 + hit * .05).toFixed(3) })
  $('letterbox').style.setProperty('--lb', `${140 * (1 - tw(t, 6.0, 6.7, E.inOutCubic)) + 110 * tw(t, 29.0, 29.8, E.inOutCubic)}px`)
  const intensity = t < 6 ? .15 + prog(t, 4.4, 6) * .45 : t < 19.5 ? .9 + beatPulse(t, 7.5, 19.5) * .35 : t < 23 ? .7 : t < 27 ? lerp(.8, 1.15, prog(t, 23, 27)) : t > 29.3 ? lerp(1, 0, prog(t, 29.3, 30)) : 1
  drawBackground(t, intensity, t < 6 ? 0 : prog(t, 7, 22))

  for (const [id, a, b] of scenes) { const on = t >= a && t <= b; show(id, on); if (on) envelope($(id), t, a, b, id.startsWith('cut')) }
  if (t < 5.9) set('t-intro', { opacity: 1, filter: 'none', transform: 'none' })
  if (t > 29.4) set('t-end', { filter: 'none' })

  // ---------- 1 · tensão ----------
  if (t <= 6.05) {
    line('tl0', t, .3, 1.55); line('tl1', t, 1.6, 2.55, true); line('tl2', t, 2.6, 3.45, true); line('tl3', t, 3.5, 4.3, true); line('tl4', t, 4.4, 6.05)
    set('tl4', { top: '42%' })
    const e = tw(t, 4.9, 5.4, E.outBack), rise = tw(t, 5.5, 6.0, E.inCubic)
    set('ember', { opacity: tw(t, 4.9, 5.1), transform: `translateY(${-rise * 40}px) scale(${lerp(0, .35, e) + rise * .35}) scaleY(${1 + noise1(t * 7) * .1})`, filter: `drop-shadow(0 0 ${30 + rise * 60}px rgba(255,140,60,.8))` })
  }
  // ---------- 2 · ignição ----------
  if (t >= 5.98 && t <= 7.6) {
    flameWobble('logo-fire', t, lerp(.25, 1, tw(t, 6.0, 6.55, E.outElastic)))
    $('logo-word').querySelectorAll('.mask > span').forEach((s, i) => { const p = tw(t, 6.2 + i * .06, 6.7 + i * .06, E.outExpo); s.style.transform = `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 8}deg)` })
    set('logo-word', { textShadow: `0 0 ${40 + hit * 60}px rgba(156,125,232,.7)` })
  }
  // ---------- 3 · cortes ----------
  cuts.forEach(([, , , , scroll], i) => {
    const a = CUT0 + i * CUT
    if (t < a - .05 || t > a + CUT + .05) return
    const right = i % 2 === 0, dir = right ? -1 : 1, cx = right ? 1270 : 650
    const p = tw(t, a - .05, a + .4, E.outQuint)
    place('cp' + i, cx, 560, `translateY(${(1 - p) * 760}px) rotateY(${dir * lerp(34, 16, p) + Math.sin(t * 1.5) * 2}deg) rotateZ(${-dir * lerp(9, 2, p)}deg) scale(1.3)`)
    if (scroll) scrollImg($('cp' + i + '-s'), tw(t, a + .4, a + CUT, E.inOutCubic) * scroll)
    sheenSweep('cp' + i, t, a + .5)
    const w = tw(t, a + .06, a + .42, E.outQuint)
    set('cw' + i, { clipPath: `inset(-10% ${(1 - w) * 100}% -10% 0)`, transform: `translateY(${(1 - w) * 30}px) scale(${1 + beatPulse(t, a, a + CUT) * .02})` })
    set('ck' + i, { opacity: tw(t, a, a + .25), transform: `translateX(${(1 - tw(t, a, a + .4)) * 40 * -dir}px)` })
    set('cn' + i, { opacity: tw(t, a + .05, a + .3) })
    set('cs' + i, { opacity: tw(t, a + .3, a + .55), transform: `translateY(${(1 - tw(t, a + .3, a + .6)) * 20}px)` })
    if (i === 0) {
      const r = prog(t, a + .55, a + 1.0)
      set('c0r', { opacity: r > 0 && r < 1 ? (1 - r) * .95 : 0, transform: `scale(${lerp(.3, 1.5, E.outCubic(r))})` })
      const on = t > a + .65, s = tw(t, a + .65, a + .95, E.outBack)
      ;['c0k', 'c0b'].forEach(id => set(id, { opacity: on ? 1 : 0, transform: `scale(${on ? s : .6})` }))
    }
  })
  // ---------- 4 · respiro ----------
  if (t >= 19.45 && t <= 23.15) {
    const d = tw(t, 19.45, 23.15, E.inOutCubic)
    set('tw-wall', { transform: `translateZ(${lerp(-1300, -650, d)}px) rotateX(${lerp(32, 20, d)}deg) rotateZ(${lerp(-12, -6, d)}deg) translateX(${lerp(320, -320, d)}px)` })
    wallShots.forEach((_, k) => set('wp' + k, { opacity: tw(t, 19.5 + (k % 5) * .05 + Math.floor(k / 5) * .1, 19.85 + (k % 5) * .05 + Math.floor(k / 5) * .1) }))
    ;[['wl0', 19.6, 20.6], ['wl1', 20.6, 21.6], ['wl2', 21.6, 23.15]].forEach(([id, a, b]) => {
      const inP = tw(t, a, a + .3, E.outExpo), outP = tw(t, b - .2, b, E.inCubic), on = t >= a && t <= b
      set(id, { opacity: on ? (inP * (1 - outP)).toFixed(3) : 0, transform: `translateY(-50%) scale(${lerp(1.18, 1, inP)})`, letterSpacing: `${lerp(.1, -.03, inP)}em` })
    })
  }
  // ---------- 5 · clímax ----------
  if (t >= 23.0 && t <= 27.05) {
    const push = lerp(1, 1.06, tw(t, 25.6, 27.0, E.inCubic))
    set('t-peak', { transform: `scale(${push})` })
    flameWobble('peak-fire', t, lerp(.4, 1, tw(t, 23.05, 23.6, E.outElastic)) * (1 + beatPulse(t, 23, 27) * .04))
    $('peak-n').textContent = Math.round(lerp(1, 60, tw(t, 23.2, 24.7, E.outCubic)))
    set('peak-n', { opacity: tw(t, 23.1, 23.35), transform: `scale(${1 + beatPulse(t, 23, 25) * .05})` })
    set('peak-label', { opacity: tw(t, 23.4, 23.7), letterSpacing: `${lerp(.7, .32, tw(t, 23.4, 24))}em` })
    ;[['peak-tag1', 25.0], ['peak-tag2', 25.25]].forEach(([id, a]) => { const p = tw(t, a, a + .5, E.outQuint); set(id, { opacity: tw(t, a, a + .2), transform: `translateY(${(1 - p) * 60}px)`, filter: `blur(${(1 - p) * 8}px)` }) })
  }
  // ---------- 6 · cartela ----------
  if (t >= 26.98) {
    flameWobble('end-fire', t, lerp(0, 1, tw(t, 27.0, 27.6, E.outElastic)))
    const lp = tw(t, 27.15, 27.9, E.outExpo)
    set('end-logo', { opacity: lp, letterSpacing: `${lerp(.8, .2, lp)}em`, filter: `blur(${(1 - lp) * 20}px)`, textShadow: '0 0 50px rgba(156,125,232,.6)' })
    const c = tw(t, 27.6, 28.1, E.outBack)
    set('end-cta', { opacity: tw(t, 27.6, 27.75), transform: `scale(${lerp(.7, 1, c)})` })
    set('end-platforms', { opacity: tw(t, 27.95, 28.3), letterSpacing: `${lerp(.7, .32, tw(t, 27.95, 28.6))}em` })
    set('end-small', { opacity: tw(t, 28.3, 28.7) * .6 })
    set('t-end', { opacity: 1 - tw(t, 29.4, 30, E.inCubic) })
  }

  drawFx(t, frame)
}

window.render = render
window.ready = Promise.all([...document.images].map(i => i.decode().catch(() => {})))
if (location.search.includes('play')) { const t0 = performance.now(); const loop = now => { render(((now - t0) / 1000) % DURATION); requestAnimationFrame(loop) }; window.ready.then(() => requestAnimationFrame(loop)) }
else render(0)
