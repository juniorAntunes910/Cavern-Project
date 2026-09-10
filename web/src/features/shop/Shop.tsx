import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { getLocalCustomization, getLocalInventory, saveLocalCustomization, type LocalCustomization } from '../../lib/local-store'
import { getBalance } from '../gamification/rewards/reward.service'
import { shopItems, type ShopItem } from './domain/shop'
import { buyItem, ownsItem } from './services/shop.service'
import '../challenges/challenges.css'
import './shop.css'

function loadoutField(item: ShopItem): keyof LocalCustomization { return item.type === 'FIRE_SKIN' ? 'fire_skin_id' : item.type === 'MASCOT' ? 'mascot_id' : item.type === 'HEAD' ? 'head_item_id' : item.type === 'BODY' ? 'body_item_id' : item.type === 'ACCESSORY' ? 'accessory_item_id' : 'effect_item_id' }
function canUnequip(item: ShopItem) { return item.type !== 'FIRE_SKIN' && item.type !== 'MASCOT' }

export function Shop() {
  const [, refresh] = useState(0); const [message, setMessage] = useState(''); const [pendingPurchase, setPendingPurchase] = useState<ShopItem | null>(null)
  const balance = getBalance(); const loadout = getLocalCustomization()
  function confirmPurchase() { if (!pendingPurchase) return; const result = buyItem(pendingPurchase); setMessage(result.message); setPendingPurchase(null); refresh(value => value + 1) }
  function equip(item: ShopItem) { const field = loadoutField(item); saveLocalCustomization({ [field]: item.id }); setMessage(`${item.name} equipado.`); refresh(value => value + 1) }
  function unequip(item: ShopItem) { const field = loadoutField(item); saveLocalCustomization({ [field]: undefined }); setMessage(`${item.name} desequipado.`); refresh(value => value + 1) }
  return <><header><p className="eyebrow">LOJA DA CAVERNA</p><h1>Personalização</h1><p className="shop-balance">🔥 {balance.embers} Brasas</p></header>{message && <p className="action-feedback">{message}</p>}<section className="panel shop-loadout"><div className={`mascot-preview ${loadout.fire_skin_id}`}><span>{shopItems.find(item => item.id === loadout.mascot_id)?.preview ?? '🤖'}</span><b>{shopItems.find(item => item.id === loadout.fire_skin_id)?.preview ?? '🔥'}</b></div><div><p className="eyebrow">SEU LOADOUT</p><h2>{shopItems.find(item => item.id === loadout.mascot_id)?.name}</h2><p>Fogueira: {shopItems.find(item => item.id === loadout.fire_skin_id)?.name}</p></div></section><section className="shop-grid">{shopItems.map(item => { const owned = ownsItem(item.id); const equipped = Object.values(loadout).includes(item.id); return <article className="panel shop-item" key={item.id}><strong>{item.preview}</strong><p className="eyebrow">{item.rarity}</p><h2>{item.name}</h2><p>{item.description}</p><b>{item.price ? `🔥 ${item.price} Brasas` : item.unlockAchievementId ? 'Conquista necessária' : 'Inicial'}</b>{equipped ? canUnequip(item) ? <button className="subtle" onClick={() => unequip(item)}>Desequipar</button> : <button disabled>Equipado</button> : owned ? <button onClick={() => equip(item)}>Equipar</button> : item.price ? <button onClick={() => setPendingPurchase(item)}>Comprar</button> : <button disabled>Indisponível</button>}</article> })}</section><section className="challenge-section"><h2>Inventário</h2><p>{getLocalInventory().length} item(ns) adquirido(s), além dos itens iniciais.</p></section><ConfirmDialog open={Boolean(pendingPurchase)} title={`Comprar ${pendingPurchase?.name ?? ''}?`} description={`Você gastará 🔥 ${pendingPurchase?.price ?? 0} Brasas para adquirir este item cosmético.`} confirmLabel="Comprar" onCancel={() => setPendingPurchase(null)} onConfirm={confirmPurchase} /></>
}
