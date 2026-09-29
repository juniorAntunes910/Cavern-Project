import { useId, useState } from 'react'

type NumberStepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  required?: boolean;
  wholeNumbers?: boolean;
};

export function NumberStepper({
  label,
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  suffix,
  required = true,
  wholeNumbers = false,
}: NumberStepperProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const errorId = useId()
  const parsed = draft === null || draft.trim() === '' ? NaN : Number(draft.replace(',', '.'))
  const invalid = draft !== null && (draft.trim() === '' || !Number.isFinite(parsed) || parsed < min || parsed > max || (wholeNumbers && !Number.isInteger(parsed)))
  const next = (amount: number) => {
    const base = Number.isFinite(parsed) ? parsed : value
    const candidate = Number((base + amount).toFixed(8))
    setDraft(null)
    onChange(Math.min(max, Math.max(min, wholeNumbers ? Math.round(candidate) : candidate)))
  }
  const setManualValue = (raw: string) => {
    setDraft(raw)
    if (!raw.trim()) return
    const nextValue = Number(raw.replace(',', '.'))
    if (Number.isFinite(nextValue) && nextValue >= min && nextValue <= max && (!wholeNumbers || Number.isInteger(nextValue))) onChange(nextValue)
  };
  const finishEditing = () => {
    if (invalid) return
    if (draft !== null) onChange(parsed)
    setDraft(null)
  }
  return (
    <div className="number-stepper">
      <span>{label}</span>
      <div>
        <button
          type="button"
          className="stepper-button"
          aria-label={`Diminuir ${label}`}
          disabled={value <= min}
          onClick={() => next(-step)}
        >
          −
        </button>
        <label className="stepper-manual">
          <input
            aria-label={label}
            aria-invalid={invalid}
            aria-describedby={invalid ? errorId : undefined}
            inputMode="decimal"
            type="number"
            min={min}
            max={max}
            step={wholeNumbers ? 1 : 'any'}
            required={required}
            value={draft ?? value}
            onFocus={() => setDraft(current => current ?? String(value))}
            onChange={(event) => setManualValue(event.target.value)}
            onBlur={finishEditing}
            onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }}
          />
          {suffix && <small>{suffix}</small>}
        </label>
        <button
          type="button"
          className="stepper-button"
          aria-label={`Aumentar ${label}`}
          disabled={value >= max}
          onClick={() => next(step)}
        >
          +
        </button>
      </div>
      {invalid && <small id={errorId} className="stepper-error" role="alert">{draft?.trim() === '' ? 'Informe um valor.' : `Use ${wholeNumbers ? 'um número inteiro' : 'um valor'} ${max === Number.MAX_SAFE_INTEGER ? `a partir de ${min}` : `entre ${min} e ${max}`}.`}</small>}
    </div>
  );
}
