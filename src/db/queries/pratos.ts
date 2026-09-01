import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pratos, pratoReceitas, receitas } from "@/db/schema";
import { mapaResumoReceitas, type ReceitaResumo } from "@/db/queries/receitas";
import { calcularPrecificacao, escalarMacros, somarMacrosLista, MACRO_ZERO, type PrecificacaoInput } from "@/lib/calculations";

export interface PratoItemComReceita {
  id: string;
  pratoId: string;
  receitaId: string;
  receitaNome: string;
  quantidadeG: number;
  ordem: number;
  custoPorGrama: number; // CMV da receita
  rendimentoTotalG: number;
  temGluten: boolean;
  temLactose: boolean;
  macrosPor100g: ReturnType<typeof escalarMacros>;
}

function paraItemComReceita(
  linha: { id: string; pratoId: string; receitaId: string; receitaNome: string; quantidadeG: number; ordem: number },
  resumo: ReceitaResumo | undefined
): PratoItemComReceita {
  const r = resumo ?? { cmv: 0, rendimentoTotalG: 0, temGluten: false, temLactose: false, macrosTotal: MACRO_ZERO };
  return {
    ...linha,
    custoPorGrama: r.cmv,
    rendimentoTotalG: r.rendimentoTotalG,
    temGluten: r.temGluten,
    temLactose: r.temLactose,
    macrosPor100g: escalarMacros(r.macrosTotal, r.rendimentoTotalG, 100),
  };
}

export function calcularTotaisPrato(
  itens: PratoItemComReceita[],
  precificacaoInput: Omit<PrecificacaoInput, "custoProducao">
) {
  const custoProducao = itens.reduce((acc, item) => acc + item.custoPorGrama * item.quantidadeG, 0);
  const precificacao = calcularPrecificacao({ ...precificacaoInput, custoProducao });

  const macros = somarMacrosLista(itens.map((i) => escalarMacros(i.macrosPor100g, 100, i.quantidadeG)));
  const temGluten = itens.some((i) => i.temGluten);
  const temLactose = itens.some((i) => i.temLactose);
  const pesoTotalG = itens.reduce((acc, i) => acc + i.quantidadeG, 0);

  return { custoProducao, precificacao, macros, temGluten, temLactose, pesoTotalG };
}

/**
 * Todos os pratos com precificação já calculada, em 3 consultas fixas
 * (independente de quantos pratos/receitas existam).
 */
export async function listarPratosComPrecificacao() {
  const [todos, todosItens, resumoReceitas] = await Promise.all([
    db.select().from(pratos).orderBy(asc(pratos.nome)),
    db
      .select({
        id: pratoReceitas.id,
        pratoId: pratoReceitas.pratoId,
        receitaId: pratoReceitas.receitaId,
        receitaNome: receitas.nome,
        quantidadeG: pratoReceitas.quantidadeG,
        ordem: pratoReceitas.ordem,
      })
      .from(pratoReceitas)
      .innerJoin(receitas, eq(receitas.id, pratoReceitas.receitaId))
      .orderBy(asc(pratoReceitas.ordem)),
    mapaResumoReceitas(),
  ]);

  const itensPorPrato = new Map<string, PratoItemComReceita[]>();
  for (const linha of todosItens) {
    const item = paraItemComReceita(linha, resumoReceitas.get(linha.receitaId));
    const lista = itensPorPrato.get(linha.pratoId);
    if (lista) lista.push(item);
    else itensPorPrato.set(linha.pratoId, [item]);
  }

  return todos.map((prato) => {
    const itens = itensPorPrato.get(prato.id) ?? [];
    const totais = calcularTotaisPrato(itens, {
      custoEmbalagem: prato.custoEmbalagem,
      margemLucro: prato.margemLucro,
      taxaCartao: prato.taxaCartao,
      imposto: prato.imposto,
      comissao: prato.comissao,
    });
    return { prato, itensCount: itens.length, ...totais };
  });
}

export async function buscarPratoComItens(id: string) {
  const [prato] = await db.select().from(pratos).where(eq(pratos.id, id)).limit(1);
  if (!prato) return null;

  const [linhas, resumoReceitas] = await Promise.all([
    db
      .select({
        id: pratoReceitas.id,
        pratoId: pratoReceitas.pratoId,
        receitaId: pratoReceitas.receitaId,
        receitaNome: receitas.nome,
        quantidadeG: pratoReceitas.quantidadeG,
        ordem: pratoReceitas.ordem,
      })
      .from(pratoReceitas)
      .innerJoin(receitas, eq(receitas.id, pratoReceitas.receitaId))
      .where(eq(pratoReceitas.pratoId, id))
      .orderBy(asc(pratoReceitas.ordem)),
    mapaResumoReceitas(),
  ]);

  const itens = linhas.map((linha) => paraItemComReceita(linha, resumoReceitas.get(linha.receitaId)));
  const totais = calcularTotaisPrato(itens, {
    custoEmbalagem: prato.custoEmbalagem,
    margemLucro: prato.margemLucro,
    taxaCartao: prato.taxaCartao,
    imposto: prato.imposto,
    comissao: prato.comissao,
  });
  return { prato, itens, ...totais };
}

export interface ReceitaParaMontagem {
  id: string;
  codigo: number;
  nome: string;
  rendimentoTotalG: number;
  custoPorGrama: number;
  temGluten: boolean;
  temLactose: boolean;
  macrosPor100g: ReturnType<typeof escalarMacros>;
}

/** Dados de todas as receitas ativas, prontos para montar um prato no cliente (custo/macros por grama já calculados). */
export async function listarReceitasParaMontagemPrato(): Promise<ReceitaParaMontagem[]> {
  const [ativas, resumoReceitas] = await Promise.all([
    db.select().from(receitas).where(eq(receitas.ativa, true)).orderBy(asc(receitas.nome)),
    mapaResumoReceitas(),
  ]);

  return ativas.map((receita) => {
    const r = resumoReceitas.get(receita.id);
    return {
      id: receita.id,
      codigo: receita.codigo,
      nome: receita.nome,
      rendimentoTotalG: receita.rendimentoTotalG,
      custoPorGrama: r?.cmv ?? 0,
      temGluten: r?.temGluten ?? false,
      temLactose: r?.temLactose ?? false,
      macrosPor100g: escalarMacros(r?.macrosTotal ?? MACRO_ZERO, r?.rendimentoTotalG ?? 0, 100),
    };
  });
}

export { MACRO_ZERO };
