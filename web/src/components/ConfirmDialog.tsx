import { useEffect } from 'react'

type ConfirmDialogProps = { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }

export function ConfirmDialog({ open, title, description, confirmLabel = 'Excluir', onConfirm, onCancel }: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onCancel, open])
  if (!open) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}><section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" onMouseDown={event => event.stopPropagation()}><p className="eyebrow">CONFIRMAÇÃO</p><h2 id="confirm-dialog-title">{title}</h2><p>{description}</p><div><button className="subtle" autoFocus onClick={onCancel}>Cancelar</button><button className="danger" onClick={onConfirm}>{confirmLabel}</button></div></section></div>
}
