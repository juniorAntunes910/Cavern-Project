import { addLocalInventoryItem, getLocalInventory, grantLocalReward } from '../../../lib/local-store'
import { getBalance } from '../../gamification/rewards/reward.service'
import type { ShopItem } from '../domain/shop'
export function ownsItem(itemId: string) { return ['fire-classic', 'bot-mk1'].includes(itemId) || getLocalInventory().some(item => item.item_id === itemId) }
export function buyItem(item: ShopItem) { if (ownsItem(item.id)) return { ok: false, message: 'Você já possui este item.' }; if (!item.price) return { ok: false, message: 'Este item é desbloqueado por conquista.' }; if (getBalance().embers < item.price) return { ok: false, message: 'Brasas insuficientes.' }; const spent = grantLocalReward('purchase', item.id, 0, -item.price, `Compra: ${item.name}`); if (!spent || !addLocalInventoryItem(item.id, 'PURCHASE')) return { ok: false, message: 'Não foi possível concluir a compra.' }; return { ok: true, message: 'Item adquirido!' } }
