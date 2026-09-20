// Cashback: parte do que o cliente gasta volta como crédito para usar na
// própria loja.
//
// A taxa abaixo é a economia do programa e foi decidida pelos sócios: 1%. Um
// pedido de R$ 100 devolve R$ 1,00 de crédito.
//
// Ela entra na precificação como dedução variável, junto com cartão e imposto:
// o crédito é gasto na própria loja, então sai da margem do pedido seguinte.
// Mexer aqui sem refazer a tabela de preços derruba a margem de contribuição
// no mesmo tanto (ver scripts/simular-precos.mts).

/** Percentual do subtotal que volta como crédito. */
export const CASHBACK_PCT = 1;

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

/**
 * Como cada lançamento aparece no extrato do cliente.
 *
 * O motivo é gravado como texto livre no banco; esta tabela é a tradução para
 * quem lê. Motivo desconhecido cai num rótulo genérico em vez de vazar o
 * identificador interno na tela.
 */
export const MOTIVO_LABEL: Record<string, string> = {
  [MOTIVO_COMPRA]: "Cashback da compra",
  [MOTIVO_USO]: "Usado no pedido",
  [MOTIVO_ESTORNO]: "Estorno de cancelamento",
};

export function rotuloMotivo(motivo: string): string {
  return MOTIVO_LABEL[motivo] ?? "Ajuste de crédito";
}
