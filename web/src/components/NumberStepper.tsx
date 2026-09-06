type NumberStepperProps = { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; step?: number; suffix?: string }

export function NumberStepper({ label, value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, suffix }: NumberStepperProps) {
  const next = (amount: number) => onChange(Math.min(max, Math.max(min, Number((value + amount).toFixed(8)))))
  return <div className="number-stepper"><span>{label}</span><div><button type="button" className="stepper-button" aria-label={`Diminuir ${label}`} disabled={value <= min} onClick={() => next(-step)}>−</button><output>{value}{suffix && <small>{suffix}</small>}</output><button type="button" className="stepper-button" aria-label={`Aumentar ${label}`} disabled={value >= max} onClick={() => next(step)}>+</button></div></div>
}
