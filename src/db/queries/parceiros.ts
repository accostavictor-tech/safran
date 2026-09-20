import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { parceiros, pedidos } from "@/db/schema";
import { normalizarCodigoParceiro, type RegraParceiro } from "@/lib/parceiros";

export type Parceiro = typeof parceiros.$inferSelect;

export async function buscarParceiroPorCodigo(bruto: string): Promise<Parceiro | null> {
  const codigo = normalizarCodigoParceiro(bruto);
  if (!codigo) return null;
  const [linha] = await db
    .select()
    .from(parceiros)
    .where(and(eq(parceiros.codigoIndicacao, codigo), eq(parceiros.ativo, true)))
    .limit(1);
  return linha ?? null;
}

export function paraRegra(parceiro: Parceiro): RegraParceiro {
  return {
    codigoIndicacao: parceiro.codigoIndicacao,
    tipo: parceiro.tipo,
    descontoPct: parceiro.descontoPct,
    comissaoPct: parceiro.comissaoPct,
    ativo: parceiro.ativo,
  };
}

export interface ResumoParceiro {
  parceiro: Parceiro;
  pedidos: number;
  vendidoCentavos: number;
  comissaoCentavos: number;
  ultimoPedido: Date | null;
}

/**
 * Parceiros com o que cada um trouxe.
 *
 * Uma consulta só, com agregação no banco: somar em memória exigiria trazer
 * todos os pedidos de todos os parceiros para o servidor a cada abertura da
 * tela.
 *
 * Pedido cancelado fica de fora do total: comissão sobre venda desfeita não é
 * devida, e contar receita que não existiu no relatório de parceiro é o tipo de
 * número que vira cobrança errada.
 */
export async function listarParceirosComResumo(): Promise<ResumoParceiro[]> {
  const contabilizavel = sql<number>`case when ${pedidos.status} = 'cancelado' then 0 else 1 end`;

  const linhas = await db
    .select({
      parceiro: parceiros,
      pedidosCount: sql<number>`coalesce(sum(${contabilizavel}), 0)::int`,
      vendido: sql<number>`coalesce(sum(${contabilizavel} * ${pedidos.totalCentavos}), 0)::int`,
      comissao: sql<number>`coalesce(sum(${contabilizavel} * ${pedidos.comissaoCentavos}), 0)::int`,
      ultimo: sql<Date | null>`max(${pedidos.createdAt})`,
    })
    .from(parceiros)
    .leftJoin(pedidos, eq(pedidos.parceiroId, parceiros.id))
    .groupBy(parceiros.id)
    .orderBy(desc(sql`coalesce(sum(${contabilizavel} * ${pedidos.totalCentavos}), 0)`));

  return linhas.map((l) => ({
    parceiro: l.parceiro,
    pedidos: Number(l.pedidosCount),
    vendidoCentavos: Number(l.vendido),
    comissaoCentavos: Number(l.comissao),
    ultimoPedido: l.ultimo ? new Date(l.ultimo) : null,
  }));
}

/** Pedidos de um parceiro, para conferência antes de pagar comissão. */
export async function pedidosDoParceiro(parceiroId: string, limite = 50) {
  return db
    .select({
      id: pedidos.id,
      codigo: pedidos.codigo,
      status: pedidos.status,
      nomeCliente: pedidos.nomeCliente,
      totalCentavos: pedidos.totalCentavos,
      comissaoCentavos: pedidos.comissaoCentavos,
      createdAt: pedidos.createdAt,
    })
    .from(pedidos)
    .where(eq(pedidos.parceiroId, parceiroId))
    .orderBy(desc(pedidos.createdAt))
    .limit(limite);
}
