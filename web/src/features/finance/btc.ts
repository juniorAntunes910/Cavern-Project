/** Quantidade de BTC equivalente a um valor em reais pela cotação informada, com a precisão de 1 satoshi (8 casas). */
export function btcFromBrl(valueBrl: number, priceBrl: number) {
  if (!Number.isFinite(valueBrl) || !Number.isFinite(priceBrl) || valueBrl <= 0 || priceBrl <= 0) return 0
  return Math.round(valueBrl / priceBrl * 1e8) / 1e8
}
