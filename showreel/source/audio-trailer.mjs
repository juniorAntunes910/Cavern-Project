// Trilha do trailer de lançamento (30 s) sintetizada do zero: tensão, ignição, montagem a 120 BPM, respiro e clímax. Sincronizada com trailer.html.
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

// ---------------- arranjo do trailer (alinhado a trailer.html, 30 s) ----------------
const chords = [[57, 60, 64, 71], [53, 57, 60, 67], [48, 52, 55, 62], [55, 59, 62, 69]] // Am(9) · Fmaj7 · Cadd9 · G(add9)
const roots = [45, 41, 48, 43]
const kickTimes = []
const K = (t, v = 1) => { kick(t, v); kickTimes.push(t) }

// 0–6 s: tensão — drone grave, batimento cardíaco que acelera, uma nota a cada frase
pad(0, 6.0, [33, 40, 45], .07, .006, .05)
crackle(0, 6, 8, .04)
let beatAt = .45, gap = 1.25
while (beatAt < 5.7) { K(beatAt, .55); K(beatAt + .2, .38); beatAt += gap; gap = Math.max(.45, gap * .82) }
;[[.3, 57], [1.6, 60], [2.6, 59], [3.5, 57], [4.4, 64]].forEach(([t, n], i) => { pluck(t, note(n - 12), .2, (i % 2 ? .3 : -.3), .4); bell(t + .02, note(n + 12), .06, 0) })
;[1.6, 2.6, 3.5].forEach(t => { tick(t, .2, 900); tick(t + .03, .15, 4200) }) // "glitch" das frases curtas
riser(4.3, 6.0, 1.1)
whoosh(6.0, .6, 1)

// 6 s: ignição — impacto + letras do logo
boom(6.0, 1.3); crash(6.0, 1); K(6.0, 1.15); crackle(6.0, 7.4, 70, .1)
pad(6.0, 7.5, chords[0], .06, .03, .09)
;[0, 1, 2, 3, 4, 5].forEach(i => pluck(6.2 + i * .06, note([69, 72, 76, 79, 81, 84][i]), .2, (i - 2.5) * .25, .12))
riser(6.9, 7.5, .5)

// 7,5–19,5 s: montagem — 120 BPM, um corte a cada 3 tempos
for (let b = 0; b < 24; b++) {
  const t = 7.5 + b * BEAT
  K(t, b % 3 === 0 ? 1.05 : .88)
  if (b % 2 === 1) clap(t, 1)
  hat(t + BEAT / 2, .9, b % 4 === 3, .25)
  if (t >= 10.5) { hat(t + BEAT / 4, .5, false, -.3); hat(t + BEAT * .75, .55, false, .3) }
  if (t >= 16.5 && b % 3 === 2) clap(t + BEAT / 2, .4)
}
for (let bar = 0; bar < 4; bar++) {
  const t = 7.5 + bar * 3, c = bar % 4
  for (let e = 0; e < 12; e++) bassNote(t + e * .25, .22, roots[c] + (e % 4 === 3 ? 12 : 0), e % 2 ? .38 : .52)
  pad(t, t + 3, chords[c], .05, .03, .1)
}
for (let k = 0; k < 96; k++) {
  const t = 7.5 + k * .125, c = Math.floor((t - 7.5) / 3) % 4
  pluck(t, note(chords[c][k % 4] + 12 + (k % 8 >= 4 ? 12 : 0)), .085, Math.sin(k) * .6, .08)
}
// cada corte: whoosh antes, nota grave na palavra, crash a cada dois cortes
for (let i = 0; i < 8; i++) {
  const a = 7.5 + i * 1.5
  if (i) whoosh(a, .35, .8)
  pluck(a + .08, note(45 + [0, 3, 5, 7, 8, 7, 5, 12][i]), .22, 0, .1)
  if (i % 2 === 0) crash(a, .4)
}
// toque no hábito (8,05–8,15 s)
tick(8.05, .3, 1500); bell(8.15, note(88), .2, .3)

// 19,5–23 s: respiro — a bateria some, um impacto por frase
whoosh(19.5, .5, .9); crash(19.5, .7)
pad(19.5, 23.0, [45, 52, 57, 64, 71], .07, .02, .07)
;[19.6, 20.6, 21.6].forEach((t, i) => { boom(t, .55 + i * .15); bell(t + .02, note([76, 79, 83][i]), .14, (i - 1) * .4); K(t, .7) })
riser(21.9, 23.0, .9)

// 23–27 s: clímax — contagem até 60, meio-tempo e virada
boom(23.0, .9); crash(23.0, .8)
for (let i = 0; i < 30; i++) tick(23.2 + 1.5 * (1 - Math.pow(1 - i / 30, 2)), .08, 1600 + i * 40)
for (let b = 0; b < 4; b++) { K(23.0 + b * 1.0, .95); clap(23.5 + b * 1.0, .7) }
for (let r = 0; r < 16; r++) { const t = 25.0 + r * .125; clap(t, .25 + r * .045); if (r % 2 === 0) K(t, .6 + r * .025) }
for (let r = 0; r < 8; r++) clap(26.5 + r * .0625, .55 + r * .05)
pad(23.0, 27.0, chords[3], .06, .03, .12)
;[25.0, 25.25].forEach((t, i) => pluck(t, note([76, 79][i]), .2, (i - .5) * .5, .12))
riser(25.4, 27.0, 1.1)

// 27 s: impacto final + acorde longo com cauda
boom(27.0, 1.3); crash(27.0, 1.1); K(27.0, 1.2)
pad(27.0, 30, [45, 57, 64, 71, 76], .07, .08, .02)
;[0, 1, 2, 3].forEach(i => bell(27.05 + i * .09, note([69, 76, 81, 88][i]), .13, (i - 1.5) * .35))
pluck(27.6, note(84), .16, 0, .2)
crackle(27, 30, 22, .06)

// ---------------- mixagem ----------------
// sidechain: pad e baixo "respiram" com o bumbo
const kicks = kickTimes.slice().sort((a, b) => a - b)
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
