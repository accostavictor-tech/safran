import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { receitas, receitaInsumos, insumos, pratoReceitas } from "@/db/schema";
import { calcularCustoItem, calcularCMV, somarMacros } from "@/lib/calculations";

export interface ReceitaItemComInsumo {
  id: string;
  insumoId: string;
  insumoNome: string;
  unidadeMedida: "g" | "ml" | "un";
  custoUnitario: number;
  fatorCorrecao: number;
  quantidadeLiquida: number;
  ordem: number;
  temGluten: boolean;
  temLactose: boolean;
  energiaKcal: number | null;
  carboidratos: number | null;
  acucaresTotais: number | null;
  proteinas: number | null;
  gordurasTotais: number | null;
  gordurasSaturadas: number | null;
  gordurasTrans: number | null;
  fibraAlimentar: number | null;
  sodio: number | null;
}

async function buscarItensDaReceita(receitaId: string): Promise<ReceitaItemComInsumo[]> {
  const linhas = await db
    .select({
      id: receitaInsumos.id,
      insumoId: receitaInsumos.insumoId,
      insumoNome: insumos.nome,
      unidadeMedida: insumos.unidadeMedida,
      custoUnitario: insumos.custo,
      fatorCorrecao: insumos.fatorCorrecao,
      quantidadeLiquida: receitaInsumos.quantidadeLiquida,
      ordem: receitaInsumos.ordem,
      temGluten: insumos.temGluten,
      temLactose: insumos.temLactose,
      energiaKcal: insumos.energiaKcal,
      carboidratos: insumos.carboidratos,
      acucaresTotais: insumos.acucaresTotais,
      proteinas: insumos.proteinas,
      gordurasTotais: insumos.gordurasTotais,
      gordurasSaturadas: insumos.gordurasSaturadas,
      gordurasTrans: insumos.gordurasTrans,
      fibraAlimentar: insumos.fibraAlimentar,
      sodio: insumos.sodio,
    })
    .from(receitaInsumos)
    .innerJoin(insumos, eq(insumos.id, receitaInsumos.insumoId))
    .where(eq(receitaInsumos.receitaId, receitaId))
    .orderBy(asc(receitaInsumos.ordem));

  return linhas;
}

export function calcularMacrosTotalReceita(itens: ReceitaItemComInsumo[]) {
  return somarMacros(itens.map((i) => ({ quantidadeLiquida: i.quantidadeLiquida, macros: i })));
}

export function calcularTotaisReceita(itens: ReceitaItemComInsumo[], rendimentoTotalG: number, pesoPorcaoG: number) {
  const custoTotal = itens.reduce(
    (acc, item) =>
      acc +
      calcularCustoItem(item.quantidadeLiquida, {
        unidadeMedida: item.unidadeMedida,
        custo: item.custoUnitario,
        fatorCorrecao: item.fatorCorrecao,
      }),
    0
  );
  const cmv = calcularCMV(custoTotal, rendimentoTotalG);
  const custoPorcao = cmv * pesoPorcaoG;
  const temGluten = itens.some((i) => i.temGluten);
  const temLactose = itens.some((i) => i.temLactose);

  return { custoTotal, cmv, custoPorcao, temGluten, temLactose };
}

export async function listarReceitasComCusto() {
  const todas = await db.select().from(receitas).orderBy(asc(receitas.nome));

  const contagemUso = await db
    .select({
      receitaId: pratoReceitas.receitaId,
      total: sql<number>`count(distinct ${pratoReceitas.pratoId})`.as("total"),
    })
    .from(pratoReceitas)
    .groupBy(pratoReceitas.receitaId);
  const usoMap = new Map(contagemUso.map((c) => [c.receitaId, c.total]));

  const resultado = [];
  for (const receita of todas) {
    const itens = await buscarItensDaReceita(receita.id);
    const totais = calcularTotaisReceita(itens, receita.rendimentoTotalG, receita.pesoPorcaoG);
    resultado.push({
      receita,
      ...totais,
      itensCount: itens.length,
      pratosCount: usoMap.get(receita.id) ?? 0,
    });
  }
  return resultado;
}

export async function buscarReceitaComItens(id: string) {
  const [receita] = await db.select().from(receitas).where(eq(receitas.id, id)).limit(1);
  if (!receita) return null;
  const itens = await buscarItensDaReceita(id);
  const totais = calcularTotaisReceita(itens, receita.rendimentoTotalG, receita.pesoPorcaoG);
  const macrosTotal = calcularMacrosTotalReceita(itens);
  return { receita, itens, ...totais, macrosTotal };
}
