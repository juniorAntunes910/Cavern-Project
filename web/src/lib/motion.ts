/** True quando o usuário pede menos movimento (sistema ou opção do Perfil). */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return true
  return document.documentElement.dataset.motion === 'reduced' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}
