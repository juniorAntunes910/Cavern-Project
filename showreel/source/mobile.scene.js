// ===================== construção (mobile) =====================
const K = 352 / 1170 // px da captura (1170 de largura) → px do vidro do telefone
const place = (id, cx, cy, transform) => set(id, { left: `${cx - 190}px`, top: `${cy - 395}px`, transform })
function scrollImg(scroller, p) {
  const img = scroller.querySelector('img')
  const h = img.naturalHeight * 352 / (img.naturalWidth || 1)
  scroller.style.transform = `translateY(${-Math.max(0, h - 762) * p}px)`
}
const slideIn = (id, t, a, dx = -80, dur = .5) => { const p = tw(t, a, a + dur); set(id, { opacity: p, transform: `translateX(${(1 - p) * dx}px)` }) }

// abertura: duas linhas com letras em máscara
const maskLetters = (id, text) => { $(id).innerHTML = [...text].map(c => c === ' ' ? '<span style="display:inline-block;width:.28em"></span>' : `<span class="mask"><span>${c}</span></span>`).join('') }
maskLetters('o-line1', 'IN YOUR'); maskLetters('o-line2', 'POCKET.')

// hábitos: toques sobre os botões reais "Concluir" (coordenadas da captura 1170×2532)
const rowY = [1333, 1547, 1760, 1974]
$('home-ov').innerHTML = rowY.map((y, i) => `<div class="done-chk" id="hk${i}" style="left:127px;top:${y - 36}px;width:72px;height:72px">✓</div><div class="done-btn" id="hb${i}" style="left:804px;top:${y - 65}px;width:246px;height:131px">Desfazer</div><div class="rip" id="hr${i}" style="left:927px;top:${y}px"></div>`).join('')

// menu: item "Hábitos" + toque
$('menu-ov').innerHTML = '<div class="menu-hl" id="mhl" style="left:48px;top:775px;width:908px;height:150px"></div><div class="rip" id="mrip" style="left:400px;top:850px"></div>'
const navNames = ['Caverna', 'Hábitos', 'Metas', 'Foco', 'Check-in', 'Academia', 'Livros', 'Conquistas', 'Loja', 'Financeiro']
$('m-chips').innerHTML = `<div style="position:absolute;left:1090px;top:760px;width:720px;display:flex;flex-wrap:wrap;gap:14px">${navNames.map((n, i) => `<span class="navchip" id="nc${i}" style="position:static">${n}</span>`).join('')}</div>`

// loja: toque em "Comprar" do Fogo Azul
$('shop-ov').innerHTML = '<div class="equipped" id="seq" style="left:637px;top:2013px;width:458px;height:133px">Equipado</div><div class="rip" id="srip" style="left:866px;top:2081px"></div>'

// painel de telas
const fanShots = ['mm-habits-full', 'mm-gym-full', 'mm-ach-full', 'mm-cavern-full', 'mm-checkins-full']
$('f-phones').innerHTML = fanShots.map((s, i) => `<div class="mphone" id="fp${i}"><div class="notch"></div><div class="glass"><div class="screen"><div class="scroller" id="fs${i}"><img src="shots/${s}.png"></div></div></div><div class="sheen"></div></div>`).join('')
const fanWords = ['HABITS', 'GYM', 'CAVERNS', 'CHECK-INS']
$('out-chips').innerHTML = ['Android', 'iOS', 'PWA', 'Offline'].map((c, i) => `<span class="navchip" id="oc${i}" style="position:static;display:inline-block;margin:0 8px">${c}</span>`).join('')

document.querySelectorAll('.mphone').forEach(p => p.querySelector('.glass').appendChild(p.querySelector('.sheen')))
const aiFull = 'Você está com 60 dias seguidos — a maior sequência até agora. Seus treinos subiram de 40 kg para 55 kg no supino, e os dias com foco registrado tiveram mais energia. Para proteger a sequência nesta semana: deixe o treino marcado para a manhã e use sessões de foco curtas nos dias corridos. Qual hábito parece mais frágil hoje?'
const aiWords = aiFull.split(' ')

// partículas (do motor do showreel) ---------------------------------------
function drawFx(t, frame) {
  fx.clearRect(0, 0, 1920, 1080)
  for (const [h, cx, cy] of [[1.0, 960, 560], [7.75, 1358, 874], [28.0, 960, 300]]) {
    const st = t - h, small = h === 7.75
    if (st > 0 && st < 1.4) {
      const r = rng(h * 100)
      for (let i = 0; i < (small ? 46 : 90); i++) {
        const a = r() * Math.PI * 2, v = (small ? 200 : 300) + r() * (small ? 500 : 900), x = cx + Math.cos(a) * v * st, y = cy + Math.sin(a) * v * st + 600 * st * st
        fx.globalAlpha = clamp(1 - st / 1.4) * (.5 + r() * .5); const s = 6 + r() * (small ? 10 : 16)
        fx.globalCompositeOperation = 'lighter'; fx.drawImage(r() < .5 ? sprGold : sprEmber, x - s, y - s, s * 2, s * 2)
      }
      fx.globalCompositeOperation = 'source-over'
    }
  }
  // confete das conquistas (16,1 s), saindo do anel
  const ct = t - 16.1
  if (ct > 0 && ct < 2.2) {
    for (const c of confetti) {
      const x = 330 + Math.cos(c.a) * c.v * ct * .8, y = 840 + Math.sin(c.a) * c.v * ct * .7 + .5 * c.g * ct * ct
      fx.save(); fx.translate(x, y); fx.rotate(c.spin * ct); fx.globalAlpha = clamp(1 - ct / 2.2)
      fx.fillStyle = `hsl(${c.hue} 85% 66%)`; fx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2); fx.restore()
    }
  }
  fx.globalAlpha = 1
  const v = fx.createRadialGradient(960, 540, 420, 960, 540, 1200)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.72)')
  fx.fillStyle = v; fx.fillRect(0, 0, 1920, 1080)
  fx.globalAlpha = .055; fx.globalCompositeOperation = 'overlay'
  fx.drawImage(grains[frame % grains.length], 0, 0, 1920, 1080)
  fx.globalAlpha = 1; fx.globalCompositeOperation = 'source-over'
}

// ===================== cenas =====================
const scenes = [['s-open', 0, 3.1], ['s-habit', 2.9, 5.1], ['s-menu', 4.9, 7.1], ['s-shop', 6.9, 9.1], ['s-chat', 8.9, 11.1], ['s-focus', 10.9, 13.1], ['s-gym', 12.9, 16.1], ['s-ach', 15.9, 18.1], ['s-check', 17.9, 20.1], ['s-cav', 19.9, 22.1], ['s-theme', 21.9, 24.1], ['s-fin', 23.9, 26.1], ['s-fan', 25.9, 28.1], ['s-out', 27.9, 30]]
function sceneEnvelope(el, t, a, b) {
  const inP = tw(t, a, a + .35, E.outExpo), outP = tw(t, b - .3, b, E.inExpo)
  set(el, { opacity: (inP * (1 - outP)).toFixed(3), transform: `scale(${lerp(1.08, 1, inP) * lerp(1, 1.18, outP)})`, filter: `blur(${(1 - inP) * 14 + outP * 18}px)` })
}
const pad = n => String(Math.floor(n)).padStart(2, '0')
const popRip = (id, t, a) => { const p = prog(t, a, a + .5); set(id, { opacity: p > 0 && p < 1 ? (1 - p) * .95 : 0, transform: `scale(${lerp(.3, 1.5, E.outCubic(p))})` }) }

function render(t) {
  const frame = Math.round(t * FPS)
  const hit = hitAmount(t)
  set('stage', { transform: `translate(${noise1(t * 40, 1) * hit * 14}px, ${noise1(t * 40, 5) * hit * 10}px)` })
  const ca = hit * 6
  document.querySelectorAll('.scene').forEach(s => { s.style.textShadow = ca > .3 ? `${ca}px 0 rgba(255,60,90,.55), ${-ca}px 0 rgba(60,200,255,.55)` : 'none' })
  set('flash', { opacity: (Math.max(...[1.0, 28.0].map(h => t >= h ? Math.exp(-(t - h) * 11) : 0)) * .42 + hit * .06).toFixed(3) })
  $('letterbox').style.setProperty('--lb', `${110 * (1 - tw(t, 1.0, 2.0, E.inOutCubic)) + 110 * tw(t, 29.0, 29.8, E.inOutCubic)}px`)
  $('timecode').textContent = `${pad(t)}:${pad((t % 1) * FPS)} · ${String(frame).padStart(4, '0')}`
  set($('progressbar').firstElementChild, { width: `${t / DURATION * 100}%` })
  const chromeOn = tw(t, 2.0, 2.5) * (1 - tw(t, 28.6, 29.0))
  set('timecode', { opacity: chromeOn }); set('brandmark', { opacity: chromeOn }); set('progressbar', { opacity: chromeOn })
  const intensity = t < 1 ? .25 + t * .4 : t > 29.3 ? lerp(1, 0, prog(t, 29.3, 30)) : .9 + beatPulse(t, 2, 28) * .35
  drawBackground(t, intensity, prog(t, 6, 26))

  for (const [id, a, b] of scenes) { const on = t >= a && t <= b; show(id, on); if (on) sceneEnvelope($(id), t, a, b) }
  if (t < .4) set('s-open', { opacity: 1, filter: 'none', transform: 'none' })
  if (t > 29.6) set('s-out', { filter: 'none' })

  // ---------- 1 · abertura ----------
  if (t <= 3.1) {
    const ign = tw(t, .95, 1.5, E.outElastic), pre = tw(t, 0, 1.0, E.inCubic)
    set('fire-big', { transform: `translateY(${lerp(320, 0, pre)}px) scale(${t < 1 ? lerp(.05, .14, pre) : lerp(.14, 1, ign)}) scaleY(${1 + noise1(t * 6) * .06}) skewX(${noise1(t * 5, 2) * 4}deg)`, opacity: t < .15 ? t / .15 : 1, filter: `drop-shadow(0 0 ${40 + hit * 80}px rgba(255,140,60,.8))` })
    const core = $('fire-big').querySelector('.core'); if (core) { core.style.transformBox = 'fill-box'; core.style.transformOrigin = '50% 100%'; core.style.transform = `scale(${1 + noise1(t * 11, 3) * .08})` }
    ;['o-line1', 'o-line2'].forEach((id, k) => $(id).querySelectorAll('.mask > span').forEach((s, i) => { const p = tw(t, 1.3 + k * .3 + i * .05, 1.8 + k * .3 + i * .05, E.outExpo); s.style.transform = `translateY(${(1 - p) * 110}%) rotate(${(1 - p) * 8}deg)` }))
    set('o-line1', { textShadow: `0 0 ${30 + hit * 60}px rgba(156,125,232,.55)` })
    set('o-tag', { opacity: tw(t, 2.0, 2.3), letterSpacing: `${lerp(.6, .32, tw(t, 2.0, 2.5))}em` })
    set('fire-big', { top: `${lerp(90, 40, tw(t, 1.3, 2.6, E.inOutCubic))}px` })
  }

  // ---------- 2 · um toque ----------
  if (t >= 2.9 && t <= 5.1) {
    const pIn = tw(t, 3.0, 3.75, E.outQuint)
    place('p-home', 1250, 560, `translateY(${(1 - pIn) * 950}px) rotateY(${lerp(-30, -14, pIn) + Math.sin(t * 1.4) * 2}deg) rotateZ(${lerp(10, 2, pIn)}deg) scale(1.28)`)
    $('p-home').querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, 4.6, 5.1))}%)`
    let done = 0
    rowY.forEach((_, i) => {
      const a = 3.85 + i * .3
      popRip('hr' + i, t, a)
      const s = tw(t, a + .1, a + .4, E.outBack), on = t > a + .1
      ;['hb', 'hk'].forEach(p => set(p + i, { opacity: on ? 1 : 0, transform: `scale(${on ? s : .6})` }))
      if (t > a + .15) done += 1
    })
    $('h-count').firstChild.nodeValue = `${done}/4`
    set('h-count', { opacity: tw(t, 3.3, 3.7), transform: `scale(${1 + beatPulse(t, 3, 5) * .04})` })
    const sp = tw(t, 4.9, 5.1, E.outBack)
    $('h-streak-n').textContent = t > 4.95 ? 61 : 60
    set('h-streak', { opacity: tw(t, 4.8, 4.95), transform: `scale(${lerp(.8, 1, sp)})` })
    set('h-word', { transform: `translateX(${lerp(60, -240, prog(t, 2.9, 5.1))}px)` })
    set('h-k', { opacity: tw(t, 3.1, 3.4), transform: `translateX(${(1 - tw(t, 3.1, 3.6)) * -50}px)` })
    slideIn('h-t1', t, 3.2); slideIn('h-t2', t, 3.35)
  }

  // ---------- 3 · menu ----------
  if (t >= 4.9 && t <= 7.1) {
    const pIn = tw(t, 5.0, 5.7, E.outQuint)
    place('p-menu', 690, 560, `translateY(${(1 - pIn) * 950}px) rotateY(${lerp(30, 14, pIn) + Math.sin(t * 1.3) * 2}deg) rotateZ(${lerp(-10, -2, pIn)}deg) scale(1.28)`)
    $('p-menu').querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, 5.7, 6.5))}%)`
    const open = tw(t, 5.55, 6.1, E.outQuint), close = tw(t, 6.7, 7.05, E.inCubic)
    const visible = open * (1 - close)
    set('menu-slide', { transform: `translateX(${-(1 - visible) * 352}px)` })
    set('menu-dim', { opacity: .5 * visible })
    popRip('mrip', t, 6.25)
    set('mhl', { opacity: t > 6.3 && t < 6.75 ? tw(t, 6.3, 6.4) : 0 })
    set('m-word', { transform: `translateX(${lerp(-60, 160, prog(t, 4.9, 7.1))}px)` })
    set('m-k', { opacity: tw(t, 5.1, 5.4), transform: `translateX(${(1 - tw(t, 5.1, 5.6)) * 50}px)` })
    slideIn('m-t1', t, 5.2, 80); slideIn('m-t2', t, 5.35, 80)
    navNames.forEach((_, i) => { const a = 5.7 + i * .07, p = tw(t, a, a + .35, E.outBack); set('nc' + i, { opacity: tw(t, a, a + .12), transform: `translateY(${(1 - p) * 30}px) scale(${lerp(.8, 1, p)})` }) })
  }

  // ---------- 4 · loja ----------
  if (t >= 6.9 && t <= 9.1) {
    const pIn = tw(t, 7.0, 7.7, E.outQuint)
    place('p-shop', 1250, 560, `translateY(${(1 - pIn) * 950}px) rotateY(${lerp(-30, -14, pIn) + Math.sin(t * 1.2) * 2}deg) rotateZ(${lerp(10, 2, pIn)}deg) scale(1.28)`)
    $('p-shop').querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, 7.8, 8.6))}%)`
    popRip('srip', t, 7.75)
    const eq = tw(t, 7.85, 8.15, E.outBack), eqOn = t > 7.85
    set('seq', { opacity: eqOn ? 1 : 0, transform: `scale(${eqOn ? eq : .7})` })
    scrollImg($('shop-scroller'), tw(t, 8.3, 9.1, E.inOutCubic) * .5)
    $('s-n').textContent = Math.round(lerp(2650, 2150, tw(t, 7.8, 8.3, E.outCubic)))
    set('s-count', { opacity: tw(t, 7.2, 7.5), transform: `scale(${1 + beatPulse(t, 7, 9) * .04})` })
    set('s-word', { transform: `translateX(${lerp(40, -220, prog(t, 6.9, 9.1))}px)` })
    set('s-k', { opacity: tw(t, 7.1, 7.4), transform: `translateX(${(1 - tw(t, 7.1, 7.6)) * -50}px)` })
    slideIn('s-t1', t, 7.2); slideIn('s-t2', t, 7.35)
  }

  // ---------- 5 · IA ----------
  if (t >= 8.9 && t <= 11.1) {
    const pIn = tw(t, 9.0, 9.7, E.outQuint)
    place('p-chat', 690, 560, `translateY(${(1 - pIn) * 950}px) rotateY(${lerp(30, 14, pIn) + Math.sin(t * 1.3) * 2}deg) rotateZ(${lerp(-10, -2, pIn)}deg) scale(1.28)`)
    $('p-chat').querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, 9.9, 10.7))}%)`
    const me = tw(t, 9.4, 9.75, E.outBack)
    set('cb1', { display: t > 9.4 ? 'block' : 'none', transform: `translateY(${(1 - me) * 24}px) scale(${lerp(.9, 1, me)})`, transformOrigin: '100% 100%' })
    const typingOn = t > 9.75 && t < 10.15
    set('chat-typing', { display: typingOn ? 'block' : 'none' })
    $('chat-typing').querySelectorAll('i').forEach((d, i) => { d.style.transform = `translateY(${Math.sin(t * 14 - i * .9) * -3}px)`; d.style.opacity = .5 + Math.sin(t * 14 - i * .9) * .3 })
    const rp = tw(t, 10.15, 10.4, E.outBack)
    set('cb2', { display: t > 10.15 ? 'block' : 'none', transform: `translateY(${(1 - rp) * 20}px)`, transformOrigin: '0 100%' })
    const n = Math.round(aiWords.length * tw(t, 10.2, 10.95, x => x))
    $('cb2-text').innerHTML = aiWords.slice(0, n).join(' ') + (n < aiWords.length && t > 10.2 ? '<span style="color:#9c7de8">▍</span>' : '')
    set('chat-send', { background: t > 9.4 ? '#7c5ad4' : '#4a3a80', color: t > 9.4 ? '#fff' : '#aeb4ac' })
    ;['c-st1', 'c-st2', 'c-st3'].forEach((id, i) => { const a = 10.3 + i * .14, p = tw(t, a, a + .4, E.outBack); set(id, { opacity: tw(t, a, a + .15), transform: `translateX(${(1 - p) * 120}px) scale(${lerp(.85, 1, p)})` }) })
    set('c-word', { transform: `translateX(${lerp(40, -200, prog(t, 8.9, 11.1))}px)` })
    set('c-k', { opacity: tw(t, 9.1, 9.4), transform: `translateX(${(1 - tw(t, 9.1, 9.6)) * 50}px)` })
    slideIn('c-t1', t, 9.2, 80); slideIn('c-t2', t, 9.35, 80)
  }

  renderExtras(t)
  const u = t - 15
  // ---------- 6 · todas as telas ----------
  if (u >= 10.9 && u <= 13.1) {
    const spread = [-760, -380, 0, 380, 760], ry = [30, 16, 0, -16, -30], sc = [.8, .94, 1.12, .94, .8], order = [0, 1, 4, 3, 2]
    fanShots.forEach((_, i) => {
      const a = 11.0 + order[i] * .09, p = tw(u, a, a + .6, E.outQuint)
      place('fp' + i, 960 + spread[i] * lerp(.55, 1, p), 610 + Math.sin(u * 1.5 + i) * 8, `translateY(${(1 - p) * 900}px) rotateY(${ry[i] * p}deg) rotateZ(${(1 - p) * (i - 2) * 6}deg) scale(${sc[i] * lerp(.9, 1, p)})`)
      set('fp' + i, { zIndex: String(10 - Math.abs(i - 2)) })
      scrollImg($('fs' + i), tw(u, 11.4, 13.0, E.inOutCubic) * (i === 2 ? .6 : .35 + i * .08))
      $('fp' + i).querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(u, 11.7 + i * .1, 12.5 + i * .1))}%)`
    })
    const wi = Math.floor((u - 11.0) / BEAT)
    if (u >= 11.0 && wi < fanWords.length) {
      const lp = ((u - 11.0) % BEAT) / BEAT
      $('f-word').textContent = fanWords[wi]
      set('f-word', { opacity: lp < .75 ? 1 : 1 - (lp - .75) * 4, transform: `scale(${lerp(1.25, 1, E.outExpo(lp))})`, letterSpacing: `${lerp(.14, .02, E.outExpo(lp))}em` })
    } else set('f-word', { opacity: 0 })
  }

  // ---------- 7 · encerramento ----------
  if (u >= 12.9) {
    const ig = tw(u, 13.0, 13.6, E.outElastic)
    set('out-fire', { transform: `scale(${lerp(0, 1, ig)}) scaleY(${1 + noise1(u * 6) * .07}) skewX(${noise1(u * 5) * 4}deg)`, filter: `drop-shadow(0 0 ${50 + Math.sin(u * 8) * 10}px rgba(255,140,60,.85))` })
    const lp = tw(u, 13.15, 13.9, E.outExpo)
    set('out-logo', { opacity: lp, letterSpacing: `${lerp(.8, .2, lp)}em`, filter: `blur(${(1 - lp) * 20}px)`, textShadow: '0 0 50px rgba(156,125,232,.6)' })
    set('out-tag', { opacity: tw(u, 13.5, 13.9), transform: `translateY(${(1 - tw(u, 13.5, 14)) * 30}px)` })
    ;['oc0', 'oc1', 'oc2', 'oc3'].forEach((id, i) => { const a = 13.7 + i * .1, p = tw(u, a, a + .35, E.outBack); set(id, { opacity: tw(u, a, a + .12), transform: `translateY(${(1 - p) * 24}px) scale(${lerp(.8, 1, p)})` }) })
    set('out-credit', { opacity: tw(u, 14.0, 14.3) })
    set('s-out', { opacity: 1 - tw(u, 14.5, 15, E.inCubic) })
  }

  drawFx(t, frame)
}

window.render = render
window.ready = Promise.all([...document.images].map(i => i.decode().catch(() => {})))
if (location.search.includes('play')) { const t0 = performance.now(); const loop = now => { render(((now - t0) / 1000) % DURATION); requestAnimationFrame(loop) }; window.ready.then(() => requestAnimationFrame(loop)) }
else render(0)
