/** Creates an identifier even on older Android WebViews without crypto.randomUUID. */
function fallbackId() {
  const random = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
    ? crypto.getRandomValues(new Uint32Array(2)).join('')
    : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`
  return `${Date.now().toString(36)}-${random}`
}

/** Creates an identifier even on older Android WebViews without crypto.randomUUID. */
export function createId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : fallbackId()
}

// A few legacy modules still use crypto.randomUUID directly. Keep them working
// on Android WebViews that implement Web Crypto but not randomUUID.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  Object.defineProperty(crypto, 'randomUUID', { configurable: true, value: fallbackId })
}
