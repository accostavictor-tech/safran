import type { MacroData } from "@/lib/calculations";

/**
 * Cálculo de dieta autoserviço.
 *
 * Dois caminhos, de propósito:
 *
 * 1. a pessoa já tem metas de uma nutricionista e só quer saber quais pratos
 *    cabem — é o caso real que originou isto, com a ficha chegando por PDF ou
 *    WhatsApp;
 * 2. a pessoa não tem metas e quer uma estimativa para começar.
 *
 * O segundo caminho é ESTIMATIVA. Mifflin-St Jeor é a fórmula de gasto
 * energético mais usada na prática clínica, mas erra em faixas de composição
 * corporal atípica e não substitui avaliação profissional. A tela diz isso; o
 * código não decide sozinho por ninguém.
 */

export type Sexo = "feminino" | "masculino";
export type Atividade = "sedentario" | "leve" | "moderado" | "intenso" | "muito_intenso";
export type Objetivo = "perder" | "manter" | "ganhar";

export const ATIVIDADE_LABEL: Record<Atividade, string> = {
  sedentario: "Sedentário (pouco ou nenhum exercício)",
  leve: "Leve (1 a 3 dias por semana)",
  moderado: "Moderado (3 a 5 dias por semana)",
  intenso: "Intenso (6 a 7 dias por semana)",
  muito_intenso: "Muito intenso (treino pesado ou trabalho físico)",
};

export const OBJETIVO_LABEL: Record<Objetivo, string> = {
  perder: "Perder peso",
  manter: "Manter o peso",
  ganhar: "Ganhar massa",
};

const FATOR_ATIVIDADE: Record<Atividade, number> = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

/** Ajuste calórico sobre o gasto estimado. Déficit e superávit moderados, de propósito. */
const AJUSTE_OBJETIVO: Record<Objetivo, number> = {
  perder: -0.2,
  manter: 0,
  ganhar: 0.15,
};

/** Gramas de proteína por quilo de peso, por objetivo. */
const PROTEINA_POR_KG: Record<Objetivo, number> = {
  perder: 2.0,
  manter: 1.4,
  ganhar: 1.8,
};

export interface PerfilCorporal {
  sexo: Sexo;
  idade: number;
  pesoKg: number;
  alturaCm: number;
  atividade: Atividade;
  objetivo: Objetivo;
}

/** Taxa metabólica basal por Mifflin-St Jeor. */
export function calcularTMB(perfil: PerfilCorporal): number {
  const base = 10 * perfil.pesoKg + 6.25 * perfil.alturaCm - 5 * perfil.idade;
  return perfil.sexo === "masculino" ? base + 5 : base - 161;
}

export interface MetasDiarias {
  kcal: number;
  proteinaG: number;
}

export function estimarMetas(perfil: PerfilCorporal): MetasDiarias {
  const gasto = calcularTMB(perfil) * FATOR_ATIVIDADE[perfil.atividade];
  return {
    kcal: Math.round(gasto * (1 + AJUSTE_OBJETIVO[perfil.objetivo])),
    proteinaG: Math.round(perfil.pesoKg * PROTEINA_POR_KG[perfil.objetivo]),
  };
}

export interface MetasPorRefeicao {
  kcal: number;
  proteinaG: number;
}

/**
 * Metas de UMA refeição.
 *
 * Divide pelo total de refeições do dia, e não pelas que vêm da Safran: quem
 * come cinco vezes e pede duas por aqui precisa das metas de duas refeições,
 * não de metade do dia em dois pratos.
 */
export function metasPorRefeicao(diarias: MetasDiarias, refeicoesPorDia: number): MetasPorRefeicao {
  const n = Math.max(1, refeicoesPorDia);
  return {
    kcal: Math.round(diarias.kcal / n),
    proteinaG: Math.round(diarias.proteinaG / n),
  };
}

export interface RestricoesDieta {
  semGluten: boolean;
  semLactose: boolean;
}

export interface PratoAvaliavel {
  id: string;
  nome: string;
  slug: string;
  macros: MacroData;
  temGluten: boolean;
  temLactose: boolean;
  precoVendaCentavos: number;
}

export interface PratoAvaliado<T extends PratoAvaliavel = PratoAvaliavel> {
  prato: T;
  /** 0 a 100. Quanto mais perto das metas, maior. */
  pontuacao: number;
  kcalDiferenca: number;
  atendeProteina: boolean;
  dentroDaFaixaCalorica: boolean;
}

/** Tolerância de caloria em torno da meta antes de o prato deixar de "caber". */
export const TOLERANCIA_KCAL = 0.2;

/**
 * Avalia um prato contra as metas de uma refeição.
 *
 * Caloria pesa mais que proteína na pontuação porque é o que estoura a dieta;
 * proteína abaixo da meta penaliza, mas proteína acima não bonifica sem
 * limite — prato hiperproteico não é "mais certo", só é diferente.
 */
export function avaliarPrato<T extends PratoAvaliavel>(prato: T, metas: MetasPorRefeicao): PratoAvaliado<T> {
  const kcal = prato.macros.energiaKcal;
  const desvioRelativo = metas.kcal > 0 ? Math.abs(kcal - metas.kcal) / metas.kcal : 1;
  const pontoCalorico = Math.max(0, 1 - desvioRelativo / (TOLERANCIA_KCAL * 2));

  const razaoProteina = metas.proteinaG > 0 ? prato.macros.proteinas / metas.proteinaG : 1;
  const pontoProteico = Math.min(1, razaoProteina);

  return {
    prato,
    pontuacao: Math.round((pontoCalorico * 0.6 + pontoProteico * 0.4) * 100),
    kcalDiferenca: Math.round(kcal - metas.kcal),
    atendeProteina: prato.macros.proteinas >= metas.proteinaG,
    dentroDaFaixaCalorica: desvioRelativo <= TOLERANCIA_KCAL,
  };
}

export function aplicarRestricoes<T extends PratoAvaliavel>(pratos: T[], restricoes: RestricoesDieta): T[] {
  return pratos.filter((p) => (!restricoes.semGluten || !p.temGluten) && (!restricoes.semLactose || !p.temLactose));
}

/** Pratos que cabem nas metas, do mais aderente ao menos. */
export function ranquear<T extends PratoAvaliavel>(
  pratos: T[],
  metas: MetasPorRefeicao,
  restricoes: RestricoesDieta
): PratoAvaliado<T>[] {
  return aplicarRestricoes(pratos, restricoes)
    .map((p) => avaliarPrato(p, metas))
    .sort((a, b) => b.pontuacao - a.pontuacao);
}

/**
 * Seleção variada para um kit.
 *
 * Não repete prato enquanto houver opção: dez refeições iguais é o jeito mais
 * rápido de a pessoa abandonar a dieta. Só volta a repetir, do melhor para o
 * pior, quando o cardápio compatível é menor que a quantidade pedida.
 */
export function montarSelecao<T extends PratoAvaliavel>(
  ranqueados: PratoAvaliado<T>[],
  quantidade: number
): T[] {
  if (ranqueados.length === 0) return [];
  const selecao: T[] = [];
  for (let i = 0; i < quantidade; i++) {
    selecao.push(ranqueados[i % ranqueados.length].prato);
  }
  return selecao;
}

/** Soma dos macros de uma seleção, para mostrar o total do plano. */
export function somarSelecao(pratos: PratoAvaliavel[]): { kcal: number; proteinaG: number; precoCentavos: number } {
  return pratos.reduce(
    (acc, p) => ({
      kcal: acc.kcal + p.macros.energiaKcal,
      proteinaG: acc.proteinaG + p.macros.proteinas,
      precoCentavos: acc.precoCentavos + p.precoVendaCentavos,
    }),
    { kcal: 0, proteinaG: 0, precoCentavos: 0 }
  );
}
