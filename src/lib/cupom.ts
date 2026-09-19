// Regras de cupom. Função pura para que a prévia no checkout e a decisão no
// servidor usem exatamente o mesmo cálculo — só o servidor decide de verdade.

export type CupomTipo = "percentual" | "fixo" | "frete_gratis";

export interface CupomRegra {
  codigo: string;
  tipo: CupomTipo;
  valorPercentual: number | null;
  valorCentavos: number | null;
  minimoCentavos: number;
  validadeInicio: Date | null;
  validadeFim: Date | null;
  limiteTotal: number | null;
  limitePorCliente: number;
  primeiraCompraApenas: boolean;
  usos: number;
  ativo: boolean;
}

export interface ContextoCupom {
  subtotalCentavos: number;
  /** Quantas vezes este cliente já usou este cupom. */
  usosDoCliente: number;
  /** Se o cliente já tem pedido anterior (não cancelado). */
  clienteJaComprou: boolean;
  agora?: Date;
}

export interface CupomAplicado {
  ok: true;
  codigo: string;
  descontoCentavos: number;
  freteGratis: boolean;
}

export interface CupomRecusado {
  ok: false;
  mensagem: string;
}

export type ResultadoCupom = CupomAplicado | CupomRecusado;

export function normalizarCodigoCupom(entrada: string): string {
  return entrada.trim().toUpperCase().replace(/\s+/g, "");
}

export function aplicarCupom(cupom: CupomRegra, ctx: ContextoCupom): ResultadoCupom {
  const agora = ctx.agora ?? new Date();

  if (!cupom.ativo) return { ok: false, mensagem: "Esse cupom não está mais válido." };
  if (cupom.validadeInicio && agora < cupom.validadeInicio) {
    return { ok: false, mensagem: "Esse cupom ainda não começou a valer." };
  }
  if (cupom.validadeFim && agora > cupom.validadeFim) {
    return { ok: false, mensagem: "Esse cupom venceu." };
  }
  if (ctx.subtotalCentavos < cupom.minimoCentavos) {
    return { ok: false, mensagem: `Esse cupom vale em pedidos a partir de ${reais(cupom.minimoCentavos)}.` };
  }
  if (cupom.limiteTotal !== null && cupom.usos >= cupom.limiteTotal) {
    return { ok: false, mensagem: "Esse cupom esgotou." };
  }
  if (ctx.usosDoCliente >= cupom.limitePorCliente) {
    return { ok: false, mensagem: "Você já usou esse cupom." };
  }
  if (cupom.primeiraCompraApenas && ctx.clienteJaComprou) {
    return { ok: false, mensagem: "Esse cupom é só para a primeira compra." };
  }

  if (cupom.tipo === "frete_gratis") {
    return { ok: true, codigo: cupom.codigo, descontoCentavos: 0, freteGratis: true };
  }

  if (cupom.tipo === "percentual") {
    const pct = cupom.valorPercentual ?? 0;
    // Nunca desconta mais que o próprio subtotal.
    const desconto = Math.min(ctx.subtotalCentavos, Math.round((ctx.subtotalCentavos * pct) / 100));
    return { ok: true, codigo: cupom.codigo, descontoCentavos: desconto, freteGratis: false };
  }

  const desconto = Math.min(ctx.subtotalCentavos, cupom.valorCentavos ?? 0);
  return { ok: true, codigo: cupom.codigo, descontoCentavos: desconto, freteGratis: false };
}

/** Descrição curta do benefício, para listar no admin. */
export function descreverCupom(cupom: Pick<CupomRegra, "tipo" | "valorPercentual" | "valorCentavos">): string {
  if (cupom.tipo === "frete_gratis") return "Frete grátis";
  if (cupom.tipo === "percentual") return `${cupom.valorPercentual ?? 0}% de desconto`;
  return `${reais(cupom.valorCentavos ?? 0)} de desconto`;
}

function reais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}
