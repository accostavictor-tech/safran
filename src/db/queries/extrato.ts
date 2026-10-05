import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { conexoesBancarias, contasBancarias, movimentacoesBancarias } from "@/db/schema";
import { intervaloDoMes } from "@/lib/extrato";

export type ContaBancaria = typeof contasBancarias.$inferSelect;
export type ConexaoBancaria = typeof conexoesBancarias.$inferSelect & { contas: ContaBancaria[] };

export async function listarConexoesComContas(): Promise<ConexaoBancaria[]> {
  const [conexoes, contas] = await Promise.all([
    db.select().from(conexoesBancarias).orderBy(asc(conexoesBancarias.createdAt)),
    db.select().from(contasBancarias).orderBy(asc(contasBancarias.nome)),
  ]);
  return conexoes.map((c) => ({ ...c, contas: contas.filter((ct) => ct.conexaoId === c.id) }));
}

/** Movimentações de um mês, mais recentes primeiro. Sem o payload bruto, que é pesado. */
export async function listarMovimentacoesDoMes(mes: string, contaId?: string) {
  const { inicio, fim } = intervaloDoMes(mes);
  return db
    .select({
      id: movimentacoesBancarias.id,
      data: movimentacoesBancarias.data,
      descricao: movimentacoesBancarias.descricao,
      valorCentavos: movimentacoesBancarias.valorCentavos,
      meio: movimentacoesBancarias.meio,
      contraparte: movimentacoesBancarias.contraparte,
      contraparteDocumento: movimentacoesBancarias.contraparteDocumento,
      categoriaPluggy: movimentacoesBancarias.categoriaPluggy,
      contaNome: contasBancarias.nome,
      contaTipo: contasBancarias.tipo,
    })
    .from(movimentacoesBancarias)
    .innerJoin(contasBancarias, eq(movimentacoesBancarias.contaId, contasBancarias.id))
    .where(
      and(
        gte(movimentacoesBancarias.data, inicio),
        lt(movimentacoesBancarias.data, fim),
        contaId ? eq(movimentacoesBancarias.contaId, contaId) : undefined
      )
    )
    .orderBy(desc(movimentacoesBancarias.data), desc(movimentacoesBancarias.createdAt));
}

export type MovimentacaoLinha = Awaited<ReturnType<typeof listarMovimentacoesDoMes>>[number];
