import { useEffect, useRef } from 'react'

type ConfirmDialogProps = { open: boolean; title: string; description: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }

export function ConfirmDialog({ open, title, description, confirmLabel = 'Excluir', onConfirm, onCancel }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const onCancelRef = useRef(onCancel)
  useEffect(() => { onCancelRef.current = onCancel }, [onCancel])

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCancelRef.current() }
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === cancelRef.current) { event.preventDefault(); confirmRef.current?.focus() }
        else if (!event.shiftKey && document.activeElement === confirmRef.current) { event.preventDefault(); cancelRef.current?.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus() }
  }, [open])

  if (!open) return null
  return <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" onMouseDown={event => event.stopPropagation()}>
      <p className="eyebrow">CONFIRMAÇÃO</p><h2 id="confirm-dialog-title">{title}</h2><p id="confirm-dialog-description">{description}</p>
      <div><button className="subtle" ref={cancelRef} onClick={onCancel}>Cancelar</button><button className="danger" ref={confirmRef} onClick={onConfirm}>{confirmLabel}</button></div>
    </section>
  </div>
}
