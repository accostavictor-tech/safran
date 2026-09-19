import type { PedidoStatus } from "@/db/queries/pedidos";

export const STATUS_LABEL: Record<PedidoStatus, string> = {
  rascunho: "Rascunho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_preparo: "Em preparo",
  pronto: "Pronto",
  em_entrega: "Em entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

/**
 * Transições permitidas. A máquina é explícita de propósito: status de pedido
 * que anda para qualquer lado vira histórico sem sentido, e a partir daqui vem
 * nota fiscal e estorno.
 */
export const TRANSICOES: Record<PedidoStatus, PedidoStatus[]> = {
  rascunho: ["aguardando_pagamento", "cancelado"],
  aguardando_pagamento: ["pago", "cancelado"],
  pago: ["em_preparo", "cancelado"],
  em_preparo: ["pronto", "cancelado"],
  pronto: ["em_entrega", "cancelado"],
  em_entrega: ["entregue", "cancelado"],
  entregue: [],
  cancelado: [],
};

/** Rótulo da ação que leva a cada status, do ponto de vista de quem opera. */
export const ACAO_LABEL: Partial<Record<PedidoStatus, string>> = {
  pago: "Confirmar pagamento",
  em_preparo: "Iniciar preparo",
  pronto: "Marcar como pronto",
  em_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelar",
};

export function podeTransicionar(de: PedidoStatus, para: PedidoStatus): boolean {
  return TRANSICOES[de].includes(para);
}

/** Status que a cozinha precisa ver: pedido pago e ainda não entregue. */
export const STATUS_ABERTOS: PedidoStatus[] = ["pago", "em_preparo", "pronto", "em_entrega"];

export function ehFinal(status: PedidoStatus): boolean {
  return TRANSICOES[status].length === 0;
}
