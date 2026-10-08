import { describe, expect, it } from 'vitest'
import { btcFromBrl } from './btc'

describe('btcFromBrl', () => {
  it('divides the BRL value by the quote and rounds to 8 decimals', () => {
    expect(btcFromBrl(1000, 500000)).toBe(0.002)
    expect(btcFromBrl(100, 300000)).toBe(0.00033333)
    expect(btcFromBrl(1, 543210.99)).toBe(0.00000184)
  })

  it('returns 0 for missing or invalid input so the form can ask for the amount', () => {
    expect(btcFromBrl(0, 500000)).toBe(0)
    expect(btcFromBrl(-5, 500000)).toBe(0)
    expect(btcFromBrl(100, 0)).toBe(0)
    expect(btcFromBrl(Number.NaN, 500000)).toBe(0)
    expect(btcFromBrl(100, Number.POSITIVE_INFINITY)).toBe(0)
  })

  it('returns 0 when the value is too small to be one satoshi', () => {
    expect(btcFromBrl(0.0001, 500000)).toBe(0)
  })
})
