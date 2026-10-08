// Semeia dados de demonstração e captura as telas reais do Cavern em 390×844 para o showreel mobile.
import { chromium } from 'playwright'
import fs from 'node:fs'

const OUT = process.argv[2]
fs.mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE ?? 'http://127.0.0.1:5173'

const pad = n => String(n).padStart(2, '0')
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const iso = (n, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString() }
let seq = 0; const id = p => `${p}-${++seq}`

const habits = [
  { id: 'h-train', name: 'Treinar 45 minutos', description: null, type: 'positive', category: 'workout', target_days: null, started_at: day(70), active: true },
  { id: 'h-read', name: 'Ler 20 páginas', description: null, type: 'positive', category: 'reading', target_days: null, started_at: day(70), active: true },
  { id: 'h-med', name: 'Meditar 10 minutos', description: null, type: 'positive', category: 'meditation', target_days: null, started_at: day(70), active: true },
  { id: 'h-sugar', name: 'Sem açúcar', description: null, type: 'abstinence', category: 'custom', target_days: 30, started_at: day(40), active: true },
]
const habitLogs = []
for (let n = 1; n <= 60; n++) for (const h of habits) {
  if (n > 23 && (n * 7 + h.id.length) % 5 === 0) continue
  habitLogs.push({ id: id('log'), habit_id: h.id, date: day(n), status: 'completed', notes: null })
}
const focusSessions = Array.from({ length: 34 }, (_, i) => {
  const minutes = 25 + ((i * 13) % 40)
  return { id: id('focus'), started_at: iso(i + 1, 8, 30), ended_at: iso(i + 1, 9, 30), duration_seconds: minutes * 60, accumulated_seconds: minutes * 60, status: 'completed', project_name: ['Portfólio', 'Estudos', 'Leitura técnica'][i % 3] }
})
// sessão de foco em andamento há 24 min 13 s (o cronômetro aparece rodando)
const startedActive = new Date(Date.now() - (24 * 60 + 13) * 1000).toISOString()
focusSessions.unshift({ id: 'focus-live', started_at: startedActive, resumed_at: startedActive, ended_at: null, duration_seconds: 0, accumulated_seconds: 0, status: 'active', project_name: 'Showreel' })

const checkins = Array.from({ length: 24 }, (_, i) => ({ id: id('ci'), date: day(i + 1), discipline: 3 + (i % 3 === 0 ? 2 : i % 2), focus: 3 + ((i + 1) % 3 === 0 ? 2 : 1), energy: 2 + ((i * 5) % 4), good_today: 'Treinei cedo e terminei o capítulo.', improve_tomorrow: 'Dormir antes das 23h.' }))
const exercise = 'default-supino-reto-com-barra'
const sessions = [40, 42.5, 45, 45, 47.5, 50, 52.5, 55].map((kg, i, arr) => {
  const n = (arr.length - i) * 4
  return { id: id('gs'), workoutName: 'Peito e tríceps', startedAt: iso(n, 7), completedAt: iso(n, 8), status: 'COMPLETED', exercises: [{ id: id('ge'), exerciseId: exercise, order: 1, sets: [8, 8, 6].map((reps, k) => ({ id: id('set'), setNumber: k + 1, weightKg: kg - k * 2.5, reps, completed: true })) }] }
})
const bodyWeight = [84.6, 84.1, 83.5, 83.2, 82.4, 81.9, 81.2, 80.6].map((kg, i, arr) => ({ id: id('bw'), date: day((arr.length - 1 - i) * 4), weightKg: kg, createdAt: iso(0) }))
const financialGoals = [{ id: 'fg-1', title: 'Reserva de emergência', target_amount: 12000, currency: 'BRL', deadline: day(-120), saved_amount: 7800, status: 'active' }]
const financeTransactions = [
  ...Array.from({ length: 3 }, (_, i) => ({ id: id('ft'), date: day(i * 30 + 2), kind: 'income', amount_brl: 6200, category: 'Salário', account: 'Conta', note: null, btc_amount: null, btc_unit_price_brl: null })),
  ...Array.from({ length: 14 }, (_, i) => ({ id: id('ft'), date: day(i * 6 + 1), kind: 'expense', amount_brl: 180 + ((i * 97) % 420), category: ['Mercado', 'Transporte', 'Lazer'][i % 3], account: 'Conta', note: null, btc_amount: null, btc_unit_price_brl: null })),
  { id: id('ft'), date: day(20), kind: 'contribution', amount_brl: 1500, category: 'Reserva', account: 'Conta', note: null, btc_amount: null, btc_unit_price_brl: null, financial_goal_id: 'fg-1' },
]
const unlocked = ['first-step', 'first-flame', 'unshakable', 'executor', 'ritual', 'sprint', 'movement', 'goal-starter', 'checkin-keeper', 'early-fire', 'iron']
const achievements = unlocked.map((a, i) => ({ id: a, unlocked_at: iso(30 - i * 2) }))
const xpLedger = Array.from({ length: 40 }, (_, i) => ({ id: id('xp'), source_key: `demo-${i}`, points: 35 + (i % 4) * 15, title: 'Hábito concluído', created_at: iso(i) }))
const rewards = [{ id: id('rw'), source_type: 'demo', source_id: 'seed', xp: 0, embers: 2650, title: 'Brasas acumuladas', created_at: iso(5) }]
const inventory = [{ item_id: 'crown', acquired_at: iso(3), acquisition_type: 'PURCHASE' }, { item_id: 'sparks', acquired_at: iso(3), acquisition_type: 'PURCHASE' }]
const customization = { fire_skin_id: 'fire-classic', mascot_id: 'bot-mk1', head_item_id: 'crown', effect_item_id: 'sparks' }
const goals = [
  { id: 'g-1', title: 'Treinar 16 vezes no mês', target_value: 16, unit: 'treinos', metric: 'workouts', period_type: 'monthly', status: 'active', manual_progress: 0, start_date: day(25), end_date: day(-5) },
  { id: 'g-2', title: 'Ler 600 páginas', target_value: 600, unit: 'páginas', metric: 'pages_read', period_type: 'total', status: 'active', manual_progress: 0, start_date: day(40), end_date: day(-20) },
]
const profile = { name: 'Alex', bio: 'Construindo um dia de cada vez.', focus: 'discipline', reminderTime: '20:00', activeDays: [0, 1, 2, 3, 4, 5, 6], weekStartsOn: 'monday', motion: 'full' }

const store = {
  'cavern.local.habits.v1': habits, 'cavern.local.habit-logs.v1': habitLogs, 'cavern.local.focus-sessions.v1': focusSessions,
  'cavern.local.checkins.v1': checkins, 'cavern.local.goals.v2': goals, 'cavern.local.financial-goals.v1': financialGoals,
  'cavern.local.finance-transactions.v1': financeTransactions, 'cavern.local.achievements.v1': achievements, 'cavern.local.xp-ledger.v1': xpLedger,
  'cavern.local.reward-transactions.v1': rewards, 'cavern.local.inventory.v1': inventory, 'cavern.local.customization.v1': customization,
  'cavern.local.profile.v1': profile, 'cavern.gym.sessions.v1': sessions, 'cavern.gym.body-weight.v1': bodyWeight,
  'cavern.ai-cloud.v1': { provider: 'gemini', apiKey: 'demo', model: 'gemini-2.5-flash' },
  'cavern.ai-data-consent.v1': { version: 1, acceptedAt: iso(0), categories: ['goalsHabits', 'focus', 'gym', 'progress'] },
}

const aiReply = 'Você está com 60 dias seguidos — a maior sequência até agora. Seus treinos subiram de 40 kg para 55 kg no supino, e os dias com foco registrado tiveram mais energia. Para proteger a sequência nesta semana: deixe o treino marcado para a manhã e use sessões de foco curtas nos dias corridos. Qual hábito parece mais frágil hoje?'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
async function context(viewport, scale, theme = 'dark') {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'reduce' })
  await ctx.addInitScript(({ store, theme }) => {
    if (sessionStorage.getItem('reel-seeded')) return
    for (const [k, v] of Object.entries(store)) localStorage.setItem(k, JSON.stringify(v))
    localStorage.setItem('cavern.theme', theme)
    sessionStorage.setItem('reel-seeded', '1')
  }, { store, theme })
  await ctx.route('https://generativelanguage.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ candidates: [{ content: { parts: [{ text: aiReply }] } }] }) }))
  return ctx
}
async function shot(page, name, opts = {}) { await page.waitForTimeout(opts.wait ?? 900); await page.screenshot({ path: `${OUT}/${name}.png`, ...opts.shot }); console.log('shot', name) }


// ---------- celular (390×844 @3x) ----------
const mctx = await context({ width: 390, height: 844 }, 3)
const m = await mctx.newPage()
m.on('pageerror', e => console.log('pageerror', e.message))
const full = async (name, wait) => { await m.addStyleTag({ content: '.mobile-topbar{position:relative !important}' }); await shot(m, name, { wait, shot: { fullPage: true } }) }
await m.goto(BASE + '/'); await shot(m, 'mm-home')
await m.getByRole('button', { name: 'Abrir menu principal' }).click(); await m.waitForTimeout(700); await shot(m, 'mm-menu', { wait: 500 })
await m.getByRole('button', { name: 'Fechar menu' }).first().click().catch(() => {})
await m.goto(BASE + '/'); await full('mm-home-full', 1200)
await m.goto(BASE + '/habits'); await full('mm-habits-full', 900)
await m.goto(BASE + '/shop'); await full('mm-shop-full', 1500)
await m.goto(BASE + '/shop'); await shot(m, 'mm-shop', { wait: 1200 })
await m.goto(BASE + '/achievements'); await full('mm-ach-full', 1600)
await m.goto(BASE + '/gym'); await m.getByRole('button', { name: 'Progresso' }).click(); await m.waitForTimeout(600)
await m.locator('.gym-exercise-select .select-trigger').click(); await m.locator('.select-menu [role=option]').nth(1).click(); await m.waitForTimeout(1200)
await shot(m, 'mm-gym', { wait: 900 }); await full('mm-gym-full', 600)
await m.goto(BASE + '/finance'); await m.addStyleTag({ content: '.pluggy-panel{display:none !important}' }); await full('mm-finance-full', 1400)
await m.goto(BASE + '/focus'); await shot(m, 'mm-focus', { wait: 1400 })
await m.goto(BASE + '/checkins'); await full('mm-checkins-full', 900)
await m.goto(BASE + '/cavern'); await m.waitForTimeout(800); await full('mm-cavern-full', 1000)
await m.goto(BASE + '/advisor'); await m.waitForTimeout(700)
await m.getByRole('button', { name: 'Iniciar conversa' }).click()
await m.getByRole('dialog').getByRole('button', { name: /Iniciar conversa/ }).click()
await m.locator('#ai-advisor-message').fill('Como mantenho minha sequência nesta semana?')
await m.locator('#ai-advisor-message').press('Enter')
await m.getByText('Qual hábito parece mais frágil').waitFor()
await m.locator('.ai-advisor-card').scrollIntoViewIfNeeded()
await shot(m, 'mm-chat', { wait: 900 })
await mctx.close()

// tema claro (cena "dia e noite")
const lctx = await context({ width: 390, height: 844 }, 3, 'light')
const lp = await lctx.newPage()
await lp.goto(BASE + '/'); await shot(lp, 'mm-home-light')
await lp.goto(BASE + '/shop'); await shot(lp, 'mm-shop-light', { wait: 1200 })
await lctx.close()
await browser.close()
