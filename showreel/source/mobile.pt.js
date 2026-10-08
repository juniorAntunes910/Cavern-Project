// ===================== versão em português (PT-BR) =====================
// Troca só os textos desenhados pelo vídeo; as telas capturadas do app já estão em português.
// Cada chave é o id do elemento. A trilha é só música, então o áudio é o mesmo da versão em inglês.
const PT_TEXT = {
  'o-tag': 'Cavern · agora na sua mão',
  'h-k': 'Ritual diário', 'h-t1': 'UM', 'h-t2': 'TOQUE.', 'h-word': 'FEITO',
  'm-k': 'Navegue', 'm-t1': 'CADA', 'm-t2': 'ÁREA.', 'm-word': 'VÁ',
  's-k': 'Personalize', 's-t1': 'DEIXE', 's-t2': 'ASSIM.', 's-word': 'SEU',
  'c-k': 'Assistente IA', 'c-t1': 'PERGUNTE', 'c-t2': 'TUDO.', 'c-word': 'IA',
  'fo-k': 'Foco', 'fo-t1': 'FIQUE', 'fo-t2': 'NO FLUXO.', 'fo-word': 'FLUXO',
  'gy-k': 'Treino', 'gy-t1': 'FORÇA.', 'gy-word': 'PESO',
  'ac-k': 'Conquistas', 'ac-t1': 'CADA', 'ac-t2': 'META.', 'ac-word': 'GANHE', 'ac-of': 'de 18 marcos',
  'ck-k': 'Check-in diário', 'ck-t1': 'COMO FOI', 'ck-t2': 'SEU DIA?', 'ck-word': 'DIA',
  'cv-k': 'Cavernas', 'cv-t1': 'UM', 'cv-t2': 'RUMO.', 'cv-word': 'VAI',
  'th-title': 'DIA & NOITE.',
  'fi-k': 'Finanças', 'fi-t1': 'SEUS', 'fi-t2': 'NÚMEROS.',
  'out-tag': 'Acenda todos os dias. Em qualquer lugar.',
  'out-credit': 'Motion design e código · Reel mobile 2026',
}
for (const [id, text] of Object.entries(PT_TEXT)) $(id).textContent = text
const PT_HTML = {
  'h-streak': '<b id="h-streak-n">60</b>dias seguidos',
  'c-st1': '<b>60</b>dias seguidos', 'c-st2': '<b>+15</b>kg no supino', 'c-st3': '<b>⚡</b>foco = energia',
}
for (const [id, html] of Object.entries(PT_HTML)) $(id).innerHTML = html
const PT_SMALL = { 'h-count': 'hábitos feitos hoje', 's-count': 'brasas · fogo azul −500', 'fo-time': 'minutos de foco profundo', 'gy-delta': 'supino · 8 semanas', 'fi-bal': 'saldo' }
for (const [id, text] of Object.entries(PT_SMALL)) $(id).querySelector('small').textContent = text
maskLetters('o-line1', 'NO SEU'); maskLetters('o-line2', 'BOLSO.')
;['Disciplina', 'Foco', 'Energia'].forEach((n, i) => { $('cr' + i).querySelector('span').textContent = n })
chipRow('cv-chips', ['Automático', 'XP + Brasas', 'Suas regras'])
chipRow('fi-chips', ['Receitas', 'Despesas', 'Metas'])
fanWords.splice(0, fanWords.length, 'HÁBITOS', 'ACADEMIA', 'CAVERNAS', 'CHECK-INS')
document.documentElement.lang = 'pt-BR'
document.title = 'Cavern · Reel mobile (PT-BR)'
// "NO FLUXO." é mais longo que "IN FLOW.": reduz a fonte para não encostar no telefone
$('fo-t1').style.fontSize = '135px'; $('fo-t2').style.fontSize = '135px'; $('fo-t2').style.top = '369px'
