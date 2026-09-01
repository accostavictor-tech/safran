import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pratos, pratoReceitas, receitas } from "@/db/schema";
import { buscarReceitaComItens } from "@/db/queries/receitas";
import { calcularPrecificacao, escalarMacros, somarMacrosLista, MACRO_ZERO, type PrecificacaoInput } from "@/lib/calculations";

export interface PratoItemComReceita {
  id: string;
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

async function buscarItensDoPrato(pratoId: string): Promise<PratoItemComReceita[]> {
  const linhas = await db
    .select({
      id: pratoReceitas.id,
      receitaId: pratoReceitas.receitaId,
      receitaNome: receitas.nome,
      quantidadeG: pratoReceitas.quantidadeG,
      ordem: pratoReceitas.ordem,
    })
    .from(pratoReceitas)
    .innerJoin(receitas, eq(receitas.id, pratoReceitas.receitaId))
    .where(eq(pratoReceitas.pratoId, pratoId))
    .orderBy(asc(pratoReceitas.ordem));

  const resultado: PratoItemComReceita[] = [];
  for (const linha of linhas) {
    const dadosReceita = await buscarReceitaComItens(linha.receitaId);
    if (!dadosReceita) continue;
    const macrosPor100g = escalarMacros(dadosReceita.macrosTotal, dadosReceita.receita.rendimentoTotalG, 100);
    resultado.push({
      ...linha,
      custoPorGrama: dadosReceita.cmv,
      rendimentoTotalG: dadosReceita.receita.rendimentoTotalG,
      temGluten: dadosReceita.temGluten,
      temLactose: dadosReceita.temLactose,
      macrosPor100g,
    });
  }
  return resultado;
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

export async function listarPratosComPrecificacao() {
  const todos = await db.select().from(pratos).orderBy(asc(pratos.nome));

  const resultado = [];
  for (const prato of todos) {
    const itens = await buscarItensDoPrato(prato.id);
    const totais = calcularTotaisPrato(itens, {
      custoEmbalagem: prato.custoEmbalagem,
      margemLucro: prato.margemLucro,
      taxaCartao: prato.taxaCartao,
      imposto: prato.imposto,
      comissao: prato.comissao,
    });
    resultado.push({ prato, itensCount: itens.length, ...totais });
  }
  return resultado;
}

export async function buscarPratoComItens(id: string) {
  const [prato] = await db.select().from(pratos).where(eq(pratos.id, id)).limit(1);
  if (!prato) return null;
  const itens = await buscarItensDoPrato(id);
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
  nome: string;
  rendimentoTotalG: number;
  custoPorGrama: number;
  temGluten: boolean;
  temLactose: boolean;
  macrosPor100g: ReturnType<typeof escalarMacros>;
}

/** Dados de todas as receitas ativas, prontos para montar um prato no cliente (custo/macros por grama já calculados). */
export async function listarReceitasParaMontagemPrato(): Promise<ReceitaParaMontagem[]> {
  const ativas = await db
    .select({ id: receitas.id })
    .from(receitas)
    .where(eq(receitas.ativa, true))
    .orderBy(asc(receitas.nome));

  const resultado: ReceitaParaMontagem[] = [];
  for (const { id } of ativas) {
    const dados = await buscarReceitaComItens(id);
    if (!dados) continue;
    resultado.push({
      id,
      nome: dados.receita.nome,
      rendimentoTotalG: dados.receita.rendimentoTotalG,
      custoPorGrama: dados.cmv,
      temGluten: dados.temGluten,
      temLactose: dados.temLactose,
      macrosPor100g: escalarMacros(dados.macrosTotal, dados.receita.rendimentoTotalG, 100),
    });
  }
  return resultado;
}

export { MACRO_ZERO };
