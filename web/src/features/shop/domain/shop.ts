export type ShopItemType = 'FIRE_SKIN' | 'MASCOT' | 'HEAD' | 'BODY' | 'ACCESSORY' | 'EFFECT'
export type ShopItem = { id: string; name: string; description: string; type: ShopItemType; rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'; price?: number; preview: string; unlockAchievementId?: string }

export const shopItems: ShopItem[] = [
  { id: 'fire-classic', name: 'Fogueira Clássica', description: 'A chama que inicia toda jornada.', type: 'FIRE_SKIN', rarity: 'COMMON', preview: '🔥' },
  { id: 'fire-blue', name: 'Fogo Azul', description: 'Chama fria, foco absoluto.', type: 'FIRE_SKIN', rarity: 'RARE', price: 500, preview: '🔵' },
  { id: 'fire-purple', name: 'Fogo Roxo', description: 'Energia da caverna.', type: 'FIRE_SKIN', rarity: 'EPIC', price: 750, preview: '🟣' },
  { id: 'fire-green', name: 'Chama Esmeralda', description: 'Uma luz viva entre as pedras.', type: 'FIRE_SKIN', rarity: 'RARE', price: 650, preview: '💚' },
  { id: 'fire-rose', name: 'Aurora Rosa', description: 'Uma fogueira com brilho suave.', type: 'FIRE_SKIN', rarity: 'EPIC', price: 900, preview: '🌸' },
  { id: 'fire-sun', name: 'Sol da Caverna', description: 'Dourado para os dias de conquista.', type: 'FIRE_SKIN', rarity: 'LEGENDARY', price: 1400, preview: '☀️' },
  { id: 'bot-mk1', name: 'Cavern Bot MK-I', description: 'Companheiro inicial.', type: 'MASCOT', rarity: 'COMMON', preview: '🤖' },
  { id: 'bat', name: 'Morcego', description: 'Guia das profundezas.', type: 'MASCOT', rarity: 'EPIC', price: 3000, preview: '🦇' },
  { id: 'bot-copper', name: 'Bot de Cobre', description: 'Um explorador de espírito quente.', type: 'MASCOT', rarity: 'RARE', price: 1100, preview: '🟠' },
  { id: 'bot-moss', name: 'Bot do Musgo', description: 'Amigo discreto das cavernas verdes.', type: 'MASCOT', rarity: 'EPIC', price: 1800, preview: '🌿' },
  { id: 'cap', name: 'Boné', description: 'Estilo para a jornada.', type: 'HEAD', rarity: 'COMMON', price: 250, preview: '🧢' },
  { id: 'miner-helmet', name: 'Capacete Minerador', description: 'Recompensa de Nas Profundezas.', type: 'HEAD', rarity: 'LEGENDARY', preview: '⛑️', unlockAchievementId: 'deep-cavern' },
  { id: 'beanie', name: 'Gorro da Noite', description: 'Para explorar sem perder o aconchego.', type: 'HEAD', rarity: 'RARE', price: 420, preview: '🎩' },
  { id: 'crown', name: 'Coroa das Brasas', description: 'Um brilho para grandes jornadas.', type: 'HEAD', rarity: 'LEGENDARY', price: 2100, preview: '👑' },
  { id: 'glasses', name: 'Óculos', description: 'Visão de longo prazo.', type: 'ACCESSORY', rarity: 'RARE', price: 300, preview: '🕶️' },
  { id: 'monocle', name: 'Monóculo', description: 'Um detalhe para o explorador curioso.', type: 'ACCESSORY', rarity: 'RARE', price: 450, preview: '🧐' },
  { id: 'star-glasses', name: 'Óculos de Estrela', description: 'Para enxergar as pequenas vitórias.', type: 'ACCESSORY', rarity: 'EPIC', price: 800, preview: '⭐' },
  { id: 'scarf', name: 'Cachecol Rubi', description: 'Cor e calor para o companheiro.', type: 'BODY', rarity: 'RARE', price: 550, preview: '🧣' },
  { id: 'cloak', name: 'Manto Violeta', description: 'Visual de quem conhece os caminhos.', type: 'BODY', rarity: 'EPIC', price: 1050, preview: '🟪' },
  { id: 'sparks', name: 'Faíscas', description: 'Pequenos brilhos ao redor da fogueira.', type: 'EFFECT', rarity: 'RARE', price: 600, preview: '✨' },
  { id: 'fireflies', name: 'Vagalumes', description: 'Luzes que acompanham a caminhada.', type: 'EFFECT', rarity: 'EPIC', price: 1200, preview: '🌟' },
]
