import { Children, Fragment, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, ReactElement, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import './select.css'

type Option = { value: string; label: string; disabled: boolean }
type OptionProps = { value?: string | number; disabled?: boolean; children?: ReactNode }

export type SelectChange = { target: { value: string; name?: string } }
type SelectProps = {
  value: string | number
  onChange: (event: SelectChange) => void
  children: ReactNode
  id?: string
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  /** Largura ajustada ao conteúdo, para uso em linhas com outros controles. */
  compact?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Substitui o <select> nativo mantendo a mesma interface (<option> como filhos e event.target.value). */
export function Select({ value, onChange, children, id, name, disabled = false, required = false, className = '', compact = false, ...aria }: SelectProps) {
  const options = useMemo(() => collectOptions(children), [children])
  const current = String(value)
  const selectedIndex = options.findIndex(option => option.value === current)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [box, setBox] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const typed = useRef({ text: '', timer: 0 })
  const listId = useId()
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null
  const showingPlaceholder = !selected || selected.value === ''

  function openMenu() {
    if (disabled) return
    setActive(Math.max(0, selectedIndex))
    setOpen(true)
  }

  function choose(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    setOpen(false)
    trigger.current?.focus()
    if (option.value !== current) onChange({ target: { value: option.value, name } })
  }

  // Posiciona o menu em "fixed" (fora de qualquer contêiner com overflow), abrindo para cima se faltar espaço.
  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const place = () => {
      const rect = trigger.current!.getBoundingClientRect()
      const below = window.innerHeight - rect.bottom - 12
      const above = rect.top - 12
      const up = below < 200 && above > below
      const maxHeight = Math.max(140, Math.min(300, up ? above : below))
      const width = Math.max(rect.width, 160)
      const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - width - 8))
      setBox(up ? { left, width, bottom: window.innerHeight - rect.top + 6, maxHeight } : { left, width, top: rect.bottom + 6, maxHeight })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); setBox(null) }
  }, [open])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (!trigger.current?.contains(target) && !list.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, box])

  useEffect(() => () => window.clearTimeout(typed.current.timer), [])

  function move(step: number) {
    if (!options.length) return
    let next = active
    for (let tries = 0; tries < options.length; tries += 1) {
      next = (next + step + options.length) % options.length
      if (!options[next].disabled) break
    }
    setActive(next)
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) { event.preventDefault(); openMenu() }
      return
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); move(1); break
      case 'ArrowUp': event.preventDefault(); move(-1); break
      case 'Home': event.preventDefault(); setActive(0); break
      case 'End': event.preventDefault(); setActive(options.length - 1); break
      case 'Enter': case ' ': event.preventDefault(); choose(active); break
      case 'Escape': event.preventDefault(); event.stopPropagation(); setOpen(false); break
      case 'Tab': setOpen(false); break
      default:
        // Busca por digitação: letras seguidas pulam para a opção que começa com o texto digitado.
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          window.clearTimeout(typed.current.timer)
          typed.current.text += event.key.toLocaleLowerCase('pt-BR')
          typed.current.timer = window.setTimeout(() => { typed.current.text = '' }, 600)
          const found = options.findIndex(option => !option.disabled && option.label.toLocaleLowerCase('pt-BR').startsWith(typed.current.text))
          if (found >= 0) setActive(found)
        }
    }
  }

  return <div className={`select${compact ? ' select-compact' : ''}${className ? ` ${className}` : ''}`}>
    {name && <input type="hidden" name={name} value={current} />}
    {required && <input className="select-validity" tabIndex={-1} required value={current} onChange={() => undefined} aria-hidden="true" />}
    <button
      ref={trigger}
      id={id}
      type="button"
      className={`select-trigger${open ? ' is-open' : ''}${showingPlaceholder ? ' is-placeholder' : ''}`}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open ? `${listId}-${active}` : undefined}
      aria-label={aria['aria-label']}
      aria-labelledby={aria['aria-labelledby']}
      disabled={disabled}
      onClick={() => (open ? setOpen(false) : openMenu())}
      onKeyDown={onKeyDown}
    >
      <span className="select-value">{selected ? selected.label : ' '}</span>
      <svg className="select-chevron" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
    {open && box && createPortal(
      <ul ref={list} id={listId} className="select-menu" role="listbox" aria-label={aria['aria-label']} style={{ left: box.left, width: box.width, top: box.top, bottom: box.bottom, maxHeight: box.maxHeight }}>
        {options.length === 0 && <li className="select-empty" role="presentation">Nenhuma opção disponível</li>}
        {options.map((option, index) => <li
          key={`${option.value}-${index}`}
          id={`${listId}-${index}`}
          data-index={index}
          data-value={option.value}
          role="option"
          aria-selected={index === selectedIndex}
          aria-disabled={option.disabled || undefined}
          className={`select-option${index === active ? ' is-active' : ''}${index === selectedIndex ? ' is-selected' : ''}${option.disabled ? ' is-disabled' : ''}${option.value === '' ? ' is-empty-value' : ''}`}
          onPointerEnter={() => !option.disabled && setActive(index)}
          onClick={() => choose(index)}
        ><span>{option.label}</span>{index === selectedIndex && <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</li>)}
      </ul>,
      document.body,
    )}
  </div>
}

function collectOptions(children: ReactNode): Option[] {
  const result: Option[] = []
  const visit = (nodes: ReactNode) => {
    Children.forEach(nodes, node => {
      if (!isValidElement(node)) return
      const element = node as ReactElement<OptionProps & { children?: ReactNode }>
      if (element.type === Fragment) { visit(element.props.children); return }
      if (element.type !== 'option') return
      const label = textOf(element.props.children)
      result.push({ value: element.props.value === undefined ? label : String(element.props.value), label, disabled: Boolean(element.props.disabled) })
    })
  }
  visit(children)
  return result
}

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}
