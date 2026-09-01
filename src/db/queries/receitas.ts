import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { receitas, receitaInsumos, insumos, pratoReceitas } from "@/db/schema";
import { calcularCustoItem, calcularCMV, somarMacros } from "@/lib/calculations";

export interface ReceitaItemComInsumo {
  id: string;
  receitaId: string;
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

const SELECT_ITEM = {
  id: receitaInsumos.id,
  receitaId: receitaInsumos.receitaId,
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
} as const;

function agruparPorReceita(itens: ReceitaItemComInsumo[]): Map<string, ReceitaItemComInsumo[]> {
  const mapa = new Map<string, ReceitaItemComInsumo[]>();
  for (const item of itens) {
    const lista = mapa.get(item.receitaId);
    if (lista) lista.push(item);
    else mapa.set(item.receitaId, [item]);
  }
  return mapa;
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

/**
 * Busca todas as receitas com seus itens já calculados, em 3 consultas fixas
 * (independente de quantas receitas existam) em vez de uma consulta por receita.
 */
export async function listarReceitasComCusto() {
  const [todas, todosItens, contagemUso] = await Promise.all([
    db.select().from(receitas).orderBy(asc(receitas.nome)),
    db
      .select(SELECT_ITEM)
      .from(receitaInsumos)
      .innerJoin(insumos, eq(insumos.id, receitaInsumos.insumoId))
      .orderBy(asc(receitaInsumos.ordem)),
    db
      .select({
        receitaId: pratoReceitas.receitaId,
        total: sql<number>`count(distinct ${pratoReceitas.pratoId})`.as("total"),
      })
      .from(pratoReceitas)
      .groupBy(pratoReceitas.receitaId),
  ]);

  const itensPorReceita = agruparPorReceita(todosItens);
  const usoMap = new Map(contagemUso.map((c) => [c.receitaId, c.total]));

  return todas.map((receita) => {
    const itens = itensPorReceita.get(receita.id) ?? [];
    const totais = calcularTotaisReceita(itens, receita.rendimentoTotalG, receita.pesoPorcaoG);
    return {
      receita,
      ...totais,
      itensCount: itens.length,
      pratosCount: usoMap.get(receita.id) ?? 0,
    };
  });
}

export interface ReceitaResumo {
  cmv: number;
  rendimentoTotalG: number;
  temGluten: boolean;
  temLactose: boolean;
  macrosTotal: ReturnType<typeof calcularMacrosTotalReceita>;
}

/**
 * Mapa receitaId -> custo/macros já calculados, para todas as receitas de
 * uma vez (2 consultas fixas). Usado para montar pratos sem uma query por receita.
 */
export async function mapaResumoReceitas(): Promise<Map<string, ReceitaResumo>> {
  const [todas, todosItens] = await Promise.all([
    db.select().from(receitas),
    db.select(SELECT_ITEM).from(receitaInsumos).innerJoin(insumos, eq(insumos.id, receitaInsumos.insumoId)),
  ]);

  const itensPorReceita = agruparPorReceita(todosItens);
  const mapa = new Map<string, ReceitaResumo>();
  for (const receita of todas) {
    const itens = itensPorReceita.get(receita.id) ?? [];
    const totais = calcularTotaisReceita(itens, receita.rendimentoTotalG, receita.pesoPorcaoG);
    mapa.set(receita.id, {
      cmv: totais.cmv,
      rendimentoTotalG: receita.rendimentoTotalG,
      temGluten: totais.temGluten,
      temLactose: totais.temLactose,
      macrosTotal: calcularMacrosTotalReceita(itens),
    });
  }
  return mapa;
}

export async function buscarReceitaComItens(id: string) {
  const [receita] = await db.select().from(receitas).where(eq(receitas.id, id)).limit(1);
  if (!receita) return null;

  const itens = await db
    .select(SELECT_ITEM)
    .from(receitaInsumos)
    .innerJoin(insumos, eq(insumos.id, receitaInsumos.insumoId))
    .where(eq(receitaInsumos.receitaId, id))
    .orderBy(asc(receitaInsumos.ordem));

  const totais = calcularTotaisReceita(itens, receita.rendimentoTotalG, receita.pesoPorcaoG);
  const macrosTotal = calcularMacrosTotalReceita(itens);
  return { receita, itens, ...totais, macrosTotal };
}
