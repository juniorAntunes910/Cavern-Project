// Trilha do reel mobile (30 s) sintetizada do zero (sem samples): 120 BPM, Lá menor, sincronizada com reel-mobile.html.
import fs from 'node:fs'

const SR = 44100, DUR = 30, N = SR * DUR, BEAT = 0.5
const buses = { drums: [new Float32Array(N), new Float32Array(N)], bass: [new Float32Array(N), new Float32Array(N)], pad: [new Float32Array(N), new Float32Array(N)], fx: [new Float32Array(N), new Float32Array(N)], send: [new Float32Array(N), new Float32Array(N)] }
let seed = 1337
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const noise = () => rnd() * 2 - 1
const TAU = Math.PI * 2

function add(bus, i, v, pan = 0, send = 0) {
  if (i < 0 || i >= N) return
  const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4)
  buses[bus][0][i] += v * l; buses[bus][1][i] += v * r
  if (send) { buses.send[0][i] += v * l * send; buses.send[1][i] += v * r * send }
}
const env = (x, a, d) => x < 0 ? 0 : x < a ? x / a : Math.exp(-(x - a) / d)
const note = n => 440 * Math.pow(2, (n - 69) / 12)

// ---------------- instrumentos ----------------
function kick(t0, vel = 1) {
  const len = 0.45 * SR, s = Math.floor(t0 * SR); let ph = 0
  for (let k = 0; k < len; k++) {
    const x = k / SR, f = 48 + 120 * Math.exp(-x * 38)
    ph += TAU * f / SR
    const v = Math.sin(ph) * Math.exp(-x * 7.5) * vel + (k < 300 ? noise() * .35 * (1 - k / 300) * vel : 0)
    add('drums', s + k, v * .9)
  }
}
function clap(t0, vel = 1) {
  const len = 0.32 * SR, s = Math.floor(t0 * SR); let lp = 0, hp = 0, prev = 0
  for (let k = 0; k < len; k++) {
    const x = k / SR
    const bursts = [0, .011, .022].reduce((m, o) => m + (x >= o ? Math.exp(-(x - o) * 140) : 0), 0) * .6 + Math.exp(-x * 18) * .55
    const n = noise(); lp += (n - lp) * .55; hp = lp - prev; prev = lp
    add('drums', s + k, hp * bursts * vel * .7, (rnd() - .5) * .2, .35)
  }
}
function hat(t0, vel = 1, open = false, pan = 0) {
  const len = (open ? .22 : .06) * SR, s = Math.floor(t0 * SR); let prev = 0
  for (let k = 0; k < len; k++) {
    const x = k / SR, n = noise(), h = n - prev; prev = n
    add('drums', s + k, h * Math.exp(-x * (open ? 18 : 70)) * vel * .22, pan, .1)
  }
}
function crash(t0, vel = 1) {
  const len = 1.8 * SR, s = Math.floor(t0 * SR); let prev = 0
  for (let k = 0; k < len; k++) { const x = k / SR, n = noise(), h = n - prev; prev = n; add('drums', s + k, h * Math.exp(-x * 2.6) * vel * .16, (rnd() - .5) * .6, .3) }
}
function boom(t0, vel = 1) {
  const len = 2.4 * SR, s = Math.floor(t0 * SR); let ph = 0, lp = 0
  for (let k = 0; k < len; k++) {
    const x = k / SR, f = 32 + 70 * Math.exp(-x * 6); ph += TAU * f / SR
    lp += (noise() - lp) * .04
    add('fx', s + k, (Math.sin(ph) * Math.exp(-x * 1.6) * .95 + lp * Math.exp(-x * 3) * 1.2) * vel, 0, .45)
  }
}
function whoosh(tEnd, len = .45, vel = 1) {
  const s = Math.floor((tEnd - len) * SR), L = len * SR; let lp = 0, bp = 0
  for (let k = 0; k < L; k++) {
    const x = k / L, cutoff = .01 + .35 * x * x
    lp += (noise() - lp) * cutoff; bp += (lp - bp) * .5
    add('fx', s + k, (lp - bp) * Math.pow(x, 2.2) * vel * 1.4, Math.sin(x * Math.PI) * .7 - .35, .3)
  }
}
function riser(t0, t1, vel = 1) {
  const s = Math.floor(t0 * SR), L = (t1 - t0) * SR; let lp = 0, ph = 0
  for (let k = 0; k < L; k++) {
    const x = k / L; lp += (noise() - lp) * (.005 + x * x * .4); ph += TAU * (200 + 1400 * x * x) / SR
    add('fx', s + k, (lp * .9 + Math.sin(ph) * .05) * Math.pow(x, 2.5) * vel, 0, .35)
  }
}
function pluck(t0, freq, vel = .5, pan = 0, decay = .25) {
  const len = (decay * 5) * SR, s = Math.floor(t0 * SR); let ph = 0, lp = 0
  for (let k = 0; k < len; k++) {
    const x = k / SR; ph += freq / SR
    const saw = 2 * (ph % 1) - 1, sq = (ph % 1) < .5 ? 1 : -1
    lp += ((saw * .6 + sq * .4) - lp) * (.08 + .5 * Math.exp(-x * 14))
    add('fx', s + k, lp * env(x, .002, decay) * vel, pan, .4)
  }
}
function bell(t0, freq, vel = .3, pan = 0) {
  const len = 1.2 * SR, s = Math.floor(t0 * SR)
  for (let k = 0; k < len; k++) { const x = k / SR; add('fx', s + k, (Math.sin(TAU * freq * x) + .45 * Math.sin(TAU * freq * 2.76 * x) * Math.exp(-x * 6)) * env(x, .001, .35) * vel, pan, .5) }
}
function tick(t0, vel = .12, freq = 2200) {
  const len = .02 * SR, s = Math.floor(t0 * SR)
  for (let k = 0; k < len; k++) { const x = k / SR; add('fx', s + k, Math.sin(TAU * freq * x) * Math.exp(-x * 260) * vel, (rnd() - .5) * .4) }
}
function crackle(t0, t1, density, vel = .1) {
  const count = Math.floor((t1 - t0) * density)
  for (let c = 0; c < count; c++) {
    const s = Math.floor((t0 + rnd() * (t1 - t0)) * SR), len = 40 + rnd() * 200, a = vel * (.3 + rnd()), pan = (rnd() - .5) * 1.4
    for (let k = 0; k < len; k++) add('fx', s + k, noise() * a * Math.exp(-k / (len * .25)), pan)
  }
}
// pad: 3 serras desafinadas por nota, filtro abrindo, ataque lento
function pad(t0, t1, notes, vel = .07, cutoffFrom = .02, cutoffTo = .12) {
  const s = Math.floor(t0 * SR), L = Math.floor((t1 - t0) * SR)
  const voices = notes.flatMap(n => [-.11, 0, .09].map(d => ({ f: note(n + d), ph: rnd(), pan: d * 5 })))
  const lpL = voices.map(() => 0)
  for (let k = 0; k < L; k++) {
    const x = k / L, a = Math.min(1, k / (SR * .35)) * Math.min(1, (L - k) / (SR * .25))
    const cutoff = cutoffFrom + (cutoffTo - cutoffFrom) * x
    voices.forEach((v, j) => {
      v.ph += v.f / SR; const saw = 2 * (v.ph % 1) - 1
      lpL[j] += (saw - lpL[j]) * cutoff
      add('pad', s + k, lpL[j] * a * vel, v.pan * .5, .55)
    })
  }
}
function bassNote(t0, len, n, vel = .5) {
  const s = Math.floor(t0 * SR), L = Math.floor(len * SR); let ph = 0, lp = 0; const f = note(n)
  for (let k = 0; k < L; k++) {
    const x = k / SR; ph += f / SR
    const saw = 2 * (ph % 1) - 1, sub = Math.sin(TAU * ph)
    lp += (saw - lp) * (.03 + .18 * Math.exp(-x * 20))
    add('bass', s + k, (lp * .55 + sub * .7) * env(x, .004, .18 + len * .4) * vel * Math.min(1, (L - k) / 200))
  }
}

// ---------------- arranjo (alinhado ao reel-mobile.html, 30 s) ----------------
const chords = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 52, 55, 62], [55, 59, 62, 69]] // Am(9) · Fmaj7 · Cadd9 · G(add9)
const roots = [45, 41, 48, 43]
const GROOVE_END = 27.9

// 0–1 s: brasa subindo; 1 s: ignição
riser(0.05, 1.0, .9); crackle(0, 2, 26, .07); pad(0, 1.0, [45, 52], .05, .01, .05)
boom(1.0, 1.1); crash(1.0, .8); crackle(1, 2.2, 60, .1)
pad(1.0, 2.0, chords[0], .06, .02, .08)
// letras de "IN YOUR / POCKET." (1.3–1.9 s)
;[0, 1, 2, 3, 4, 5, 6].forEach(i => pluck(1.3 + i * .05, note([69, 72, 76, 79, 81, 84, 88][i]), .2, (i - 3) * .22, .12))
;[0, 1, 2, 3, 4, 5, 6].forEach(i => pluck(1.6 + i * .05, note([67, 71, 74, 77, 79, 83, 86][i]), .16, (i - 3) * .22, .12))

// 2–27.9 s: groove (a energia sobe em três degraus: 4 s, 7 s e 16 s)
for (let b = 0; b < 52; b++) {
  const t = 2 + b * BEAT
  if (t >= GROOVE_END) break
  kick(t, b % 4 === 0 ? 1 : .9)
  if (t >= 4 && b % 2 === 1) clap(t, 1)
  hat(t + BEAT / 2, .9, b % 4 === 3, .25)
  if (t >= 7) { hat(t + BEAT / 4, .5, false, -.3); hat(t + BEAT * .75, .55, false, .3) }
  if (t >= 16 && b % 4 === 2) clap(t + BEAT / 2, .35)
  // virada antes do leque final
  if (t >= 25.5 && t < 26) for (let r = 0; r < 4; r++) clap(t + r * BEAT / 4, .35 + r * .18)
}
for (let bar = 0; bar < 13; bar++) {
  const t = 2 + bar * 2, c = bar % 4
  if (t >= GROOVE_END) break
  for (let e = 0; e < 8; e++) { const tt = t + e * .25; if (tt >= GROOVE_END) break; bassNote(tt, .22, roots[c] + (e === 6 ? 12 : 0), e % 2 ? .38 : .5) }
  pad(t, Math.min(t + 2, GROOVE_END + .05), chords[c], .055, .03, .1)
}
// arpejo do bate-papo ao final (9–27.9 s)
for (let k = 0; k < 152; k++) {
  const t = 9 + k * .125
  if (t >= GROOVE_END) break
  const c = Math.floor((t - 2) / 2) % 4, chord = chords[c]
  pluck(t, note(chord[k % 4] + 12 + (k % 8 >= 4 ? 12 : 0)), t >= 16 ? .11 : .09, Math.sin(k) * .6, .09)
}
// transições: whoosh antes de cada corte; crash a cada troca de bloco
;[3, 5, 7, 9, 11, 13, 16, 18, 20, 22, 24, 26].forEach(h => { whoosh(h, .42, .9); if ([5, 9, 13, 18, 22, 26].includes(h)) crash(h, .45) })

// 3.85–4.75 s: quatro toques nos hábitos; 4.95 s: sequência 60 → 61
;[0, 1, 2, 3].forEach(i => { tick(3.85 + i * .3, .28, 1500); bell(3.95 + i * .3, note([76, 79, 83, 88][i]), .2, (i - 1.5) * .3) })
bell(4.95, note(93), .2, 0); bell(5.0, note(100), .12, .3)
// 5.55 s: menu desliza; 6.25 s: toque em "Hábitos"
whoosh(5.8, .3, .6); tick(6.25, .3, 1200); tick(6.3, .15, 1800)
for (let i = 0; i < 10; i++) tick(5.7 + i * .07, .08, 2000 + i * 120)
// 7.75 s: compra na loja e contagem das brasas
tick(7.75, .3, 1300)
;[0, 1, 2, 3].forEach(i => bell(7.8 + i * .06, note([84, 88, 91, 96][i]), .16, (i - 1.5) * .35))
for (let i = 0; i < 14; i++) tick(7.8 + .5 * (1 - Math.pow(1 - i / 14, 2)), .09, 2600 - i * 60)
// 9.4 s mensagem; 9.75–10.15 s digitando; 10.2–10.95 s resposta
pluck(9.4, note(76), .18, .5, .1)
for (let i = 0; i < 12; i++) tick(9.78 + i * .03, .04, 1500 + i * 40)
pluck(10.15, note(72), .16, -.5, .1)
for (let i = 0; i < 34; i++) tick(10.2 + i * .022 + rnd() * .008, .05, 3200 + rnd() * 900)
// 11.3–12.5 s: cronômetro do foco
for (let i = 0; i < 26; i++) tick(11.3 + 1.2 * (1 - Math.pow(1 - i / 26, 2)), .09, 1800 + i * 30)
// 13.3–14.9 s: pontos do gráfico da academia e +14,9 kg
for (let i = 0; i < 8; i++) tick(13.3 + i / 7 * 1.5, .12, 1200 + i * 140)
for (let i = 0; i < 24; i++) tick(13.4 + 1.5 * (1 - Math.pow(1 - i / 24, 2)), .06, 2200 + i * 40)
// 16.1 s: anel das conquistas + confete (sinos)
;[0, 1, 2, 3, 4, 5, 6].forEach(i => bell(16.1 + i * .05, note([81, 84, 88, 91, 93, 96, 100][i]), .14, (rnd() - .5)))
for (let i = 0; i < 18; i++) tick(16.1 + 1.1 * (1 - Math.pow(1 - i / 18, 2)), .08, 1700 + i * 55)
// 18.4–19.5 s: barras do check-in
;[0, 1, 2].forEach(i => { for (let k = 0; k < 9; k++) tick(18.4 + i * .15 + k * .09, .07, 1500 + i * 300 + k * 60) })
// 20.6–20.9 s: três chips da Caverna
;[0, 1, 2].forEach(i => bell(20.6 + i * .1, note([76, 81, 84][i]), .17, (i - 1) * .4))
// 22.0 e 22.2 s: os dois telefones entram (dia e noite)
bell(22.1, note(81), .16, -.4); bell(22.3, note(88), .16, .4)
// 24.3–25.4 s: saldo do financeiro contando
for (let i = 0; i < 30; i++) tick(24.3 + 1.1 * (1 - Math.pow(1 - i / 30, 2)), .08, 1400 + i * 30)
;[24.8, 24.9, 25.0].forEach((t, i) => bell(t, note([79, 83, 88][i]), .13, (i - 1) * .3))
// 26 s: telas em leque, uma palavra por tempo
;[0, 1, 2, 3, 4, 5, 6].forEach(i => bell(26.0 + i * .05, note([81, 84, 88, 91, 93, 96, 100][i]), .13, (rnd() - .5)))
;[26, 26.5, 27, 27.5].forEach(t => pluck(t, note(45), .25, 0, .08))
riser(26.9, 27.95, .8)
// 28 s: impacto final + acorde longo com cauda
boom(28.0, 1.2); crash(28.0, 1); kick(28.0, 1.1)
pad(28.0, 30, [45, 57, 64, 71, 76], .065, .08, .02)
;[0, 1, 2, 3].forEach(i => bell(28.05 + i * .09, note([69, 76, 81, 88][i]), .12, (i - 1.5) * .35))
crackle(28, 30, 22, .06)

// ---------------- mixagem ----------------
// sidechain: pad e baixo "respiram" com o bumbo
const kicks = []; for (let b = 0; b < 52; b++) { const t = 2 + b * BEAT; if (t < 27.9) kicks.push(t) } ; kicks.push(28.0)
function duck(i) { const t = i / SR; let last = -10; for (const k of kicks) { if (k <= t) last = k; else break } return 1 - .62 * Math.exp(-(t - last) * 9) }
// reverb de Schroeder no envio
function reverb(inp) {
  const out = new Float32Array(N), combs = [1557, 1617, 1491, 1422].map(d => ({ d, buf: new Float32Array(d), i: 0, fb: .8, lp: 0 }))
  const aps = [225, 556].map(d => ({ d, buf: new Float32Array(d), i: 0 }))
  for (let n = 0; n < N; n++) {
    let s = 0
    for (const c of combs) { const y = c.buf[c.i]; c.lp = y * .6 + c.lp * .4; c.buf[c.i] = inp[n] + c.lp * c.fb; c.i = (c.i + 1) % c.d; s += y }
    s *= .25
    for (const a of aps) { const y = a.buf[a.i]; const x = s + y * -.5; a.buf[a.i] = x; a.i = (a.i + 1) % a.d; s = y + x * .5 }
    out[n] = s
  }
  return out
}
const rvL = reverb(buses.send[0]), rvR = reverb(buses.send[1].map((v, i) => buses.send[1][Math.max(0, i - 23)]))
const mixL = new Float32Array(N), mixR = new Float32Array(N)
for (let i = 0; i < N; i++) {
  const d = duck(i)
  mixL[i] = buses.drums[0][i] * .95 + buses.bass[0][i] * .8 * d + buses.pad[0][i] * d + buses.fx[0][i] * .9 + rvL[i] * .5
  mixR[i] = buses.drums[1][i] * .95 + buses.bass[1][i] * .8 * d + buses.pad[1][i] * d + buses.fx[1][i] * .9 + rvR[i] * .5
}
// saturação suave, normalização a -1 dBFS e fade final
let peak = 0
for (let i = 0; i < N; i++) { mixL[i] = Math.tanh(mixL[i] * 1.3); mixR[i] = Math.tanh(mixR[i] * 1.3); peak = Math.max(peak, Math.abs(mixL[i]), Math.abs(mixR[i])) }
const gain = Math.pow(10, -1 / 20) / peak
const fadeStart = 29.2 * SR
const pcm = Buffer.alloc(N * 4)
for (let i = 0; i < N; i++) {
  const f = i > fadeStart ? Math.max(0, 1 - (i - fadeStart) / (N - fadeStart)) : 1
  const fin = Math.min(1, i / 400)
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mixL[i] * gain * f * fin)) * 32767), i * 4)
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, mixR[i] * gain * f * fin)) * 32767), i * 4 + 2)
}
const header = Buffer.alloc(44)
header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVE', 8); header.write('fmt ', 12)
header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(2, 22); header.writeUInt32LE(SR, 24)
header.writeUInt32LE(SR * 4, 28); header.writeUInt16LE(4, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
fs.writeFileSync(process.argv[2] ?? 'soundtrack.wav', Buffer.concat([header, pcm]))
console.log('soundtrack ok · peak before norm', peak.toFixed(3), '· gain', gain.toFixed(3))
