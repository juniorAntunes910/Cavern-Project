// ===================== cenas extras (7–13): foco, academia, conquistas, check-in, caverna, tema, financeiro =====================
const phoneHtml = (id, inner) => `<div class="mphone" id="${id}"><div class="notch"></div><div class="glass"><div class="screen">${inner}</div><div class="sheen"></div></div></div>`
const shotPhone = (id, img, scrollerId) => phoneHtml(id, `<div class="scroller"${scrollerId ? ` id="${scrollerId}"` : ''}><img src="shots/${img}.png"></div>`)
const textBlock = (p, left, kicker, l1, l2, size, word, wordCss) => `<div id="${p}-word" class="abs mega outline" style="${wordCss}">${word}</div><div id="${p}-k" class="abs kicker" style="left:${left}px;top:${size >= 190 ? 190 : 170}px">${kicker}</div><div id="${p}-t1" class="abs mega" style="left:${left}px;top:${size >= 190 ? 250 : 225}px;font-size:${size}px">${l1}</div><div id="${p}-t2" class="abs mega" style="left:${left}px;top:${(size >= 190 ? 250 : 225) + size * .88}px;font-size:${size}px;color:#9c7de8">${l2}</div>`

const gyLoads = [40, 42.5, 45, 45, 47.5, 50, 52.5, 55]
const gx = i => 40 + i * (700 / 7), gy = v => 320 - (v - 38) / (57 - 38) * 280
const gyPath = gyLoads.map((v, i) => `${i ? 'L' : 'M'}${gx(i)} ${gy(v)}`).join(' ')
const checkRowsData = [['Discipline', 4.1], ['Focus', 4.3], ['Energy', 3.3]]

$('s-fan').insertAdjacentHTML('beforebegin', `
<section class="scene" id="s-focus">
  ${textBlock('fo', 140, 'Focus', 'STAY', 'IN FLOW.', 190, 'FLOW', 'left:-40px;top:380px;font-size:520px')}
  <div id="fo-time" class="bigcount" style="left:140px;top:690px;font-size:150px">00:00:00<small>minutes of deep focus</small></div>
  <div class="abs" style="left:140px;top:930px;width:720px;height:10px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden"><i id="fo-fill" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#ff8a3d,#9c7de8)"></i></div>
  ${shotPhone('p-focus', 'mm-focus')}
</section>
<section class="scene" id="s-gym">
  ${textBlock('gy', 1060, 'Training', 'STRONGER.', '', 130, 'LIFT', 'left:0;right:-40px;text-align:right;top:360px;font-size:520px')}
  <svg id="gy-chart" class="abs" viewBox="0 0 780 360" width="780" height="360" style="left:1060px;top:400px;overflow:visible">
    ${[40, 45, 50, 55].map(v => `<line x1="30" x2="760" y1="${gy(v)}" y2="${gy(v)}" stroke="rgba(255,255,255,.1)" stroke-dasharray="6 10" stroke-width="2"/><text x="0" y="${gy(v) + 8}" fill="rgba(241,242,238,.5)" font-family="Bahnschrift" font-size="22">${v}</text>`).join('')}
    <defs><linearGradient id="gyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9c7de8" stop-opacity=".45"/><stop offset="1" stop-color="#9c7de8" stop-opacity="0"/></linearGradient></defs>
    <path id="gy-area" d="${gyPath} L${gx(7)} 340 L${gx(0)} 340 Z" fill="url(#gyg)"/>
    <path id="gy-line" d="${gyPath}" pathLength="100" stroke-dasharray="0 100" fill="none" stroke="#b79cff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    ${gyLoads.map((v, i) => `<circle id="gd${i}" cx="${gx(i)}" cy="${gy(v)}" r="0" fill="${i === 7 ? '#b79cff' : '#0b0b0e'}" stroke="#b79cff" stroke-width="5"/>`).join('')}
  </svg>
  <div id="gy-delta" class="bigcount" style="left:1060px;top:790px;font-size:150px">+0,0 kg<small>bench press · 8 weeks</small></div>
  ${shotPhone('p-gym', 'mm-gym-full', 'gy-scroller')}
</section>
<section class="scene" id="s-ach">
  ${textBlock('ac', 140, 'Achievements', 'EARN', 'IT.', 230, 'WIN', 'left:-60px;top:360px;font-size:560px')}
  <svg id="ac-ring" class="abs" viewBox="-170 -170 340 340" width="340" height="340" style="left:140px;top:690px;overflow:visible">
    <circle r="140" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="22"/>
    <circle id="ac-arc" r="140" fill="none" stroke="#9c7de8" stroke-width="22" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100" transform="rotate(-90)"/>
    <text id="ac-count" y="26" text-anchor="middle" fill="#f1f2ee" font-family="Segoe UI" font-weight="900" font-size="84">0</text>
  </svg>
  <div class="abs hud" style="left:520px;top:830px;font-size:26px">of 18 milestones</div>
  ${shotPhone('p-ach', 'mm-ach-full', 'ac-scroller')}
</section>
<section class="scene" id="s-check">
  ${textBlock('ck', 1060, 'Daily check-in', 'HOW WAS', 'YOUR DAY?', 120, 'DAY', 'left:0;right:-40px;text-align:right;top:360px;font-size:520px')}
  ${checkRowsData.map(([n, v], i) => `<div id="cr${i}" class="abs" style="left:1060px;top:${640 + i * 110}px;width:700px"><div class="hud" style="font-size:22px;display:flex;justify-content:space-between"><span>${n}</span><b id="cv${i}" style="color:#f1f2ee">0.0 / 5</b></div><div style="margin-top:12px;height:14px;border-radius:9px;background:rgba(255,255,255,.1);overflow:hidden"><i id="cf${i}" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#9c7de8,#c9b6ff)"></i></div></div>`).join('')}
  ${shotPhone('p-check', 'mm-checkins-full', 'ck-scroller')}
</section>
<section class="scene" id="s-cav">
  ${textBlock('cv', 140, 'Caverns', 'ONE', 'PATH.', 230, 'GO', 'left:-60px;top:380px;font-size:560px')}
  <div id="cv-chips" class="abs" style="left:140px;top:790px"></div>
  ${shotPhone('p-cav', 'mm-cavern-full', 'cv-scroller')}
</section>
<section class="scene" id="s-theme">
  <div id="th-title" class="abs mega" style="left:0;right:0;top:36px;text-align:center;font-size:104px;letter-spacing:.04em">DAY &amp; NIGHT.</div>
  ${shotPhone('p-dark', 'mm-home')}
  ${shotPhone('p-light', 'mm-home-light')}
</section>
<section class="scene" id="s-fin">
  ${textBlock('fi', 1060, 'Finance', 'KNOW YOUR', 'NUMBERS.', 120, 'R$', 'left:0;right:-60px;text-align:right;top:360px;font-size:560px')}
  <div id="fi-bal" class="bigcount" style="left:1060px;top:600px;font-size:150px">R$ 0<small>balance</small></div>
  <div id="fi-chips" class="abs" style="left:1060px;top:880px"></div>
  ${shotPhone('p-fin', 'mm-finance-full', 'fi-scroller')}
</section>`)

const chipRow = (id, items) => { $(id).innerHTML = `<div style="display:flex;gap:14px;flex-wrap:wrap;width:760px">${items.map((n, i) => `<span class="navchip" id="${id}${i}" style="position:static">${n}</span>`).join('')}</div>` }
chipRow('cv-chips', ['Auto-tracked', 'XP + Embers', 'Your rules'])
chipRow('fi-chips', ['Income', 'Expenses', 'Goals'])

// ---- helpers de cena ----
const enter = (id, cx, t, a, dir) => { const p = tw(t, a, a + .7, E.outQuint); place(id, cx, 560, `translateY(${(1 - p) * 950}px) rotateY(${dir * lerp(30, 14, p) + Math.sin(t * 1.3) * 2}deg) rotateZ(${-dir * lerp(10, 2, p)}deg) scale(1.28)`); return p }
const sheenSweep = (id, t, a) => { $(id).querySelector('.sheen').style.transform = `translateX(${lerp(-130, 130, prog(t, a, a + .8))}%)` }
const copyIn = (p, t, a, dir) => { set(p + '-k', { opacity: tw(t, a, a + .3), transform: `translateX(${(1 - tw(t, a, a + .5)) * 50 * dir}px)` }); slideIn(p + '-t1', t, a + .1, 80 * dir); slideIn(p + '-t2', t, a + .25, 80 * dir) }
const wordDrift = (p, t, a, b, dir = -1) => set(p + '-word', { transform: `translateX(${lerp(60 * -dir, 200 * dir, prog(t, a, b))}px)` })
const chipsIn = (id, n, t, a) => { for (let i = 0; i < n; i++) { const s = a + i * .1, p = tw(t, s, s + .35, E.outBack); set(id + i, { opacity: tw(t, s, s + .12), transform: `translateY(${(1 - p) * 30}px) scale(${lerp(.8, 1, p)})` }) } }
const scrollPx = (scroller, px) => { scroller.style.transform = `translateY(${-px}px)` }

function renderExtras(t) {
  // ---------- 7 · foco ----------
  if (t >= 10.9 && t <= 13.1) {
    enter('p-focus', 1250, t, 11.0, -1); sheenSweep('p-focus', t, 11.8)
    const secs = Math.round(lerp(0, 25 * 60 + 4, tw(t, 11.3, 12.5, E.outCubic)))
    $('fo-time').firstChild.nodeValue = `00:${pad(secs / 60)}:${pad(secs % 60)}`
    set('fo-time', { opacity: tw(t, 11.2, 11.5), transform: `scale(${1 + beatPulse(t, 11, 13) * .03})` })
    set('fo-fill', { width: `${tw(t, 11.3, 12.6, E.inOutCubic) * 100}%` })
    copyIn('fo', t, 11.15, -1); wordDrift('fo', t, 10.9, 13.1, 1)
  }
  // ---------- 8 · academia (3,2 s) ----------
  if (t >= 12.9 && t <= 16.1) {
    enter('p-gym', 690, t, 13.0, 1); sheenSweep('p-gym', t, 13.6)
    scrollImg($('gy-scroller'), tw(t, 14.4, 15.9, E.inOutCubic) * .4)
    const dp = tw(t, 13.3, 14.8, E.inOutCubic)
    $('gy-line').setAttribute('stroke-dasharray', `${(dp * 100).toFixed(2)} 100`)
    $('gy-area').style.clipPath = `inset(0 ${(1 - dp) * 100}% 0 0)`
    gyLoads.forEach((_, i) => { const a = 13.3 + i / 7 * 1.5; $('gd' + i).setAttribute('r', (11 * tw(t, a, a + .3, E.outBack)).toFixed(2)) })
    $('gy-delta').firstChild.nodeValue = `+${(15 * tw(t, 13.4, 14.9, E.outCubic)).toFixed(1).replace('.', ',')} kg`
    set('gy-delta', { opacity: tw(t, 13.4, 13.7), transform: `scale(${1 + beatPulse(t, 13, 16) * .03})` })
    set('gy-chart', { opacity: tw(t, 13.2, 13.5), transform: `translateY(${(1 - tw(t, 13.2, 13.9)) * 40}px)` })
    set('gy-k', { opacity: tw(t, 13.15, 13.45), transform: `translateX(${(1 - tw(t, 13.15, 13.65)) * 50}px)` }); slideIn('gy-t1', t, 13.25, 80)
    set('gy-t2', { opacity: 0 }); wordDrift('gy', t, 12.9, 16.1)
  }
  // ---------- 9 · conquistas ----------
  if (t >= 15.9 && t <= 18.1) {
    enter('p-ach', 1250, t, 16.0, -1); sheenSweep('p-ach', t, 16.6)
    scrollImg($('ac-scroller'), tw(t, 16.6, 18.0, E.inOutCubic) * .18)
    const ap = tw(t, 16.1, 17.2, E.outCubic)
    $('ac-arc').setAttribute('stroke-dasharray', `${(ap * 61).toFixed(2)} 100`)
    $('ac-count').textContent = Math.round(11 * ap)
    set('ac-ring', { transform: `scale(${lerp(.5, 1, tw(t, 16.05, 16.6, E.outBack)) + beatPulse(t, 16, 18) * .03}) rotate(${lerp(-90, 0, tw(t, 16.05, 16.8))}deg)` })
    copyIn('ac', t, 16.15, -1); wordDrift('ac', t, 15.9, 18.1, 1)
  }
  // ---------- 10 · check-in ----------
  if (t >= 17.9 && t <= 20.1) {
    enter('p-check', 690, t, 18.0, 1); sheenSweep('p-check', t, 18.6)
    scrollImg($('ck-scroller'), tw(t, 18.7, 20.0, E.inOutCubic) * .22)
    checkRowsData.forEach(([, v], i) => { const a = 18.4 + i * .15, p = tw(t, a, a + .9, E.outCubic); $('cf' + i).style.width = `${p * v / 5 * 100}%`; $('cv' + i).textContent = `${(v * p).toFixed(1)} / 5`; set('cr' + i, { opacity: tw(t, a, a + .2), transform: `translateX(${(1 - tw(t, a, a + .5)) * 60}px)` }) })
    copyIn('ck', t, 18.15, 1); wordDrift('ck', t, 17.9, 20.1)
  }
  // ---------- 11 · caverna ----------
  if (t >= 19.9 && t <= 22.1) {
    enter('p-cav', 1250, t, 20.0, -1); sheenSweep('p-cav', t, 20.6)
    scrollImg($('cv-scroller'), tw(t, 20.6, 22.0, E.inOutCubic) * .2)
    copyIn('cv', t, 20.15, -1); wordDrift('cv', t, 19.9, 22.1, 1); chipsIn('cv-chips', 3, t, 20.6)
  }
  // ---------- 12 · dia e noite ----------
  if (t >= 21.9 && t <= 24.1) {
    const pd = tw(t, 22.0, 22.7, E.outQuint), pl = tw(t, 22.2, 22.9, E.outQuint)
    place('p-dark', 800, 590, `translate(${(1 - pd) * -700}px, ${(1 - pd) * 500}px) rotateY(${lerp(40, 20, pd) + Math.sin(t * 1.4) * 2}deg) rotateZ(${lerp(-12, -3, pd)}deg) scale(1.02)`)
    place('p-light', 1130, 590, `translate(${(1 - pl) * 700}px, ${(1 - pl) * 500}px) rotateY(${lerp(-40, -20, pl) + Math.sin(t * 1.4 + 1) * 2}deg) rotateZ(${lerp(12, 3, pl)}deg) scale(1.02)`)
    sheenSweep('p-dark', t, 22.8); sheenSweep('p-light', t, 22.95)
    set('th-title', { opacity: tw(t, 22.05, 22.4), transform: `translateY(${(1 - tw(t, 22.05, 22.7)) * -40}px)`, letterSpacing: `${lerp(.3, .04, tw(t, 22.05, 22.8))}em` })
  }
  // ---------- 13 · financeiro ----------
  if (t >= 23.9 && t <= 26.1) {
    enter('p-fin', 690, t, 24.0, 1); sheenSweep('p-fin', t, 24.6)
    scrollPx($('fi-scroller'), tw(t, 24.7, 26.0, E.inOutCubic) * 420)
    const bp = tw(t, 24.3, 25.4, E.outCubic)
    $('fi-bal').firstChild.nodeValue = `R$ ${Math.round(12053 * bp).toLocaleString('pt-BR')}`
    set('fi-bal', { opacity: tw(t, 24.2, 24.5), transform: `scale(${1 + beatPulse(t, 24, 26) * .03})` })
    copyIn('fi', t, 24.15, 1); wordDrift('fi', t, 23.9, 26.1); chipsIn('fi-chips', 3, t, 24.8)
  }
}
