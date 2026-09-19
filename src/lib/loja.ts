// Regras da loja. Funções puras, compartilhadas entre o cliente (que mostra os
// valores) e o servidor (que decide os valores). O cliente nunca manda preço:
// manda só prato e quantidade, e o servidor recalcula tudo daqui.

/** Pedido mínimo para entrega, em centavos. */
export const PEDIDO_MINIMO_CENTAVOS = 8000;

export const WHATSAPP_SAFRAN = "5582999550922";

export interface ItemCarrinho {
  pratoId: string;
  quantidade: number;
}

export interface LinhaPedido {
  precoUnitarioCentavos: number;
  quantidade: number;
}

export interface ZonaFrete {
  freteCentavos: number;
  freteGratisAcimaCentavos: number | null;
}

export function calcularSubtotal(linhas: LinhaPedido[]): number {
  return linhas.reduce((acc, l) => acc + l.precoUnitarioCentavos * l.quantidade, 0);
}

export function resolverFrete(zona: ZonaFrete | null, subtotalCentavos: number): number {
  if (!zona) return 0;
  if (zona.freteGratisAcimaCentavos !== null && subtotalCentavos >= zona.freteGratisAcimaCentavos) return 0;
  return zona.freteCentavos;
}

export function calcularTotal(subtotal: number, frete: number, desconto = 0): number {
  return Math.max(0, subtotal - desconto + frete);
}

export function faltaParaMinimo(subtotalCentavos: number): number {
  return Math.max(0, PEDIDO_MINIMO_CENTAVOS - subtotalCentavos);
}

/**
 * Normaliza bairro para comparação: sem acento, sem caixa, sem espaço extra.
 * "Jatiúca", "jatiuca" e "JATIUCA " caem todos na mesma zona.
 */
export function normalizarBairro(bairro: string): string {
  return bairro
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Telefone brasileiro para o formato que gravamos: só dígitos com o 55 na
 * frente. É a identidade do cliente, então precisa ser estável.
 */
export function normalizarTelefone(entrada: string): string | null {
  const digitos = entrada.replace(/\D/g, "");
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return null;
}

export function formatarTelefone(e164: string): string {
  const d = e164.startsWith("55") ? e164.slice(2) : e164;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}
