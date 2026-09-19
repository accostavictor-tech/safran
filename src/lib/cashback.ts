// Cashback: parte do que o cliente gasta volta como crédito para usar na
// própria loja.
//
// A taxa abaixo é a economia do programa e é decisão dos sócios, não um padrão
// meu. Em 5%, um pedido de R$ 100 devolve R$ 5,00 de crédito.

/** Percentual do subtotal que volta como crédito. */
export const CASHBACK_PCT = 5;

/** Crédito mínimo acumulado para poder usar, para não virar centavo solto. */
export const MINIMO_USO_CENTAVOS = 500;

export const MOTIVO_COMPRA = "cashback_compra";
export const MOTIVO_USO = "uso_em_pedido";

/**
 * Cashback de um pedido. Só o subtotal conta: frete é custo de logística, não
 * consumo, e devolver parte dele incentivaria pedido pequeno e frequente.
 * Arredonda para baixo, para nunca creditar mais do que a regra.
 */
export function cashbackDoPedido(subtotalCentavos: number): number {
  return Math.floor((subtotalCentavos * CASHBACK_PCT) / 100);
}

export function podeUsar(saldoCentavos: number): boolean {
  return saldoCentavos >= MINIMO_USO_CENTAVOS;
}

/** Quanto do saldo cabe neste pedido: nunca mais que o subtotal. */
export function creditoAplicavel(saldoCentavos: number, subtotalCentavos: number): number {
  if (!podeUsar(saldoCentavos)) return 0;
  return Math.min(saldoCentavos, subtotalCentavos);
}

/** Estorno do crédito de um pedido cancelado. */
export const MOTIVO_ESTORNO = "estorno_cancelamento";
