import { and, asc, count, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { creditoMovimentos, cupons, pedidos } from "@/db/schema";
import type { CupomRegra } from "@/lib/cupom";

export type Cupom = typeof cupons.$inferSelect;

export function paraRegra(cupom: Cupom): CupomRegra {
  return {
    codigo: cupom.codigo,
    tipo: cupom.tipo,
    valorPercentual: cupom.valorPercentual,
    valorCentavos: cupom.valorCentavos,
    minimoCentavos: cupom.minimoCentavos,
    validadeInicio: cupom.validadeInicio,
    validadeFim: cupom.validadeFim,
    limiteTotal: cupom.limiteTotal,
    limitePorCliente: cupom.limitePorCliente,
    primeiraCompraApenas: cupom.primeiraCompraApenas,
    usos: cupom.usos,
    ativo: cupom.ativo,
  };
}

export async function buscarCupomPorCodigo(codigo: string): Promise<Cupom | null> {
  const [cupom] = await db.select().from(cupons).where(eq(cupons.codigo, codigo)).limit(1);
  return cupom ?? null;
}

export async function listarCupons(): Promise<Cupom[]> {
  return db.select().from(cupons).orderBy(asc(cupons.codigo));
}

/** Quantas vezes um telefone já usou um cupom, ignorando pedidos cancelados. */
export async function contarUsosDoTelefone(codigo: string, telefone: string): Promise<number> {
  const [linha] = await db
    .select({ total: count() })
    .from(pedidos)
    .where(
      and(eq(pedidos.cupomCodigo, codigo), eq(pedidos.telefoneCliente, telefone), ne(pedidos.status, "cancelado"))
    );
  return Number(linha?.total ?? 0);
}

/** Se o telefone já tem pedido anterior não cancelado — usado por cupom de primeira compra. */
export async function telefoneJaComprou(telefone: string): Promise<boolean> {
  const [linha] = await db
    .select({ total: count() })
    .from(pedidos)
    .where(and(eq(pedidos.telefoneCliente, telefone), ne(pedidos.status, "cancelado")));
  return Number(linha?.total ?? 0) > 0;
}

/** Saldo de cashback do cliente, em centavos: a soma dos movimentos. */
export async function saldoCreditoCentavos(clienteId: string): Promise<number> {
  const [linha] = await db
    .select({ saldo: sql<number>`coalesce(sum(${creditoMovimentos.centavos}), 0)::int` })
    .from(creditoMovimentos)
    .where(eq(creditoMovimentos.clienteId, clienteId));
  return Number(linha?.saldo ?? 0);
}
