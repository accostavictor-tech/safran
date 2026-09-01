// Lógica de custo, fator de correção, CMV, nutrientes e precificação.
// Portada da fórmula já validada no sistema anterior (Tabela Fácil / Lovable),
// simplificada para o uso interno da Safran.

export interface MacroData {
  energiaKcal: number;
  carboidratos: number;
  acucaresTotais: number;
  proteinas: number;
  gordurasTotais: number;
  gordurasSaturadas: number;
  gordurasTrans: number;
  fibraAlimentar: number;
  sodio: number;
}

export type MacroInput = { [K in keyof MacroData]?: number | null };

export const MACRO_ZERO: MacroData = {
  energiaKcal: 0,
  carboidratos: 0,
  acucaresTotais: 0,
  proteinas: 0,
  gordurasTotais: 0,
  gordurasSaturadas: 0,
  gordurasTrans: 0,
  fibraAlimentar: 0,
  sodio: 0,
};

export type UnidadeMedida = "g" | "ml" | "un";

export interface InsumoParaCalculo {
  unidadeMedida: UnidadeMedida;
  custo: number; // R$ por 100g, 100ml, ou por unidade
  fatorCorrecao: number;
  macros?: MacroInput | null;
}

/**
 * Custo de um item de receita.
 * - g/ml: custo é por 100g/100ml -> (quantidadeBruta / 100) * custo
 * - un: custo é por unidade -> quantidadeBruta * custo
 * quantidadeBruta = quantidadeLiquida * fatorCorrecao
 */
export function calcularQuantidadeBruta(quantidadeLiquida: number, fatorCorrecao: number): number {
  return quantidadeLiquida * (fatorCorrecao || 1);
}

export function calcularCustoItem(quantidadeLiquida: number, insumo: InsumoParaCalculo): number {
  const quantidadeBruta = calcularQuantidadeBruta(quantidadeLiquida, insumo.fatorCorrecao);
  const custo =
    insumo.unidadeMedida === "un"
      ? quantidadeBruta * insumo.custo
      : (quantidadeBruta / 100) * insumo.custo;
  return Number.isFinite(custo) ? custo : 0;
}

export function calcularCMV(custoTotal: number, rendimentoTotalG: number): number {
  if (!rendimentoTotalG) return 0;
  return custoTotal / rendimentoTotalG;
}

export function calcularCustoPorPeso(custoTotal: number, rendimentoTotalG: number, pesoG: number): number {
  if (!rendimentoTotalG) return 0;
  return calcularCMV(custoTotal, rendimentoTotalG) * pesoG;
}

/**
 * Soma os macronutrientes de uma lista de itens (quantidade líquida em g/ml/un + macros por 100g do insumo)
 * e retorna o total absoluto (não por porção).
 */
export function somarMacros(
  itens: { quantidadeLiquida: number; macros?: MacroInput | null }[]
): MacroData {
  const total = { ...MACRO_ZERO };
  for (const item of itens) {
    const fator = item.quantidadeLiquida / 100;
    const m = item.macros ?? {};
    total.energiaKcal += (m.energiaKcal ?? 0) * fator;
    total.carboidratos += (m.carboidratos ?? 0) * fator;
    total.acucaresTotais += (m.acucaresTotais ?? 0) * fator;
    total.proteinas += (m.proteinas ?? 0) * fator;
    total.gordurasTotais += (m.gordurasTotais ?? 0) * fator;
    total.gordurasSaturadas += (m.gordurasSaturadas ?? 0) * fator;
    total.gordurasTrans += (m.gordurasTrans ?? 0) * fator;
    total.fibraAlimentar += (m.fibraAlimentar ?? 0) * fator;
    total.sodio += (m.sodio ?? 0) * fator;
  }
  return total;
}

/** Reescala um total de macros (calculado sobre `baseG`) para uma nova quantidade em gramas. */
export function escalarMacros(macros: MacroData, baseG: number, novaG: number): MacroData {
  if (!baseG) return { ...MACRO_ZERO };
  const fator = novaG / baseG;
  return {
    energiaKcal: macros.energiaKcal * fator,
    carboidratos: macros.carboidratos * fator,
    acucaresTotais: macros.acucaresTotais * fator,
    proteinas: macros.proteinas * fator,
    gordurasTotais: macros.gordurasTotais * fator,
    gordurasSaturadas: macros.gordurasSaturadas * fator,
    gordurasTrans: macros.gordurasTrans * fator,
    fibraAlimentar: macros.fibraAlimentar * fator,
    sodio: macros.sodio * fator,
  };
}

export function somarMacrosLista(itens: MacroData[]): MacroData {
  const total = { ...MACRO_ZERO };
  for (const m of itens) {
    total.energiaKcal += m.energiaKcal;
    total.carboidratos += m.carboidratos;
    total.acucaresTotais += m.acucaresTotais;
    total.proteinas += m.proteinas;
    total.gordurasTotais += m.gordurasTotais;
    total.gordurasSaturadas += m.gordurasSaturadas;
    total.gordurasTrans += m.gordurasTrans;
    total.fibraAlimentar += m.fibraAlimentar;
    total.sodio += m.sodio;
  }
  return total;
}

export interface PrecificacaoInput {
  custoProducao: number; // custo das receitas usadas no prato
  custoEmbalagem: number;
  margemLucro: number; // % — margem bruta que define o preço (markup sobre o preço)
  taxaCartao: number; // %
  imposto: number; // %
  comissao: number; // %
}

export interface PrecificacaoResultado {
  custoTotal: number; // produção + embalagem
  precoVenda: number;
  valorTaxaCartao: number;
  valorImposto: number;
  valorComissao: number;
  totalDeducoes: number;
  recebidoLiquido: number;
  lucroLiquido: number;
  margemLiquidaPct: number;
  cmvPctSobrePreco: number; // custo / preço, referência de saúde do prato
}

/**
 * Mesma fórmula usada no sistema anterior:
 * 1. Preço = (custo produção + embalagem) / (1 - margem bruta%)
 * 2. Cartão, imposto e comissão são descontados sobre o preço de venda
 * 3. Lucro líquido = preço - deduções - custo total
 */
export function calcularPrecificacao(input: PrecificacaoInput): PrecificacaoResultado {
  const custoTotal = input.custoProducao + input.custoEmbalagem;
  const margemDecimal = input.margemLucro / 100;
  const margemValida = margemDecimal < 1;

  const precoVenda = margemValida && custoTotal > 0 ? custoTotal / (1 - margemDecimal) : 0;

  const valorTaxaCartao = precoVenda * (input.taxaCartao / 100);
  const valorImposto = precoVenda * (input.imposto / 100);
  const valorComissao = precoVenda * (input.comissao / 100);
  const totalDeducoes = valorTaxaCartao + valorImposto + valorComissao;

  const recebidoLiquido = precoVenda - totalDeducoes;
  const lucroLiquido = recebidoLiquido - custoTotal;
  const margemLiquidaPct = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0;
  const cmvPctSobrePreco = precoVenda > 0 ? (custoTotal / precoVenda) * 100 : 0;

  return {
    custoTotal,
    precoVenda,
    valorTaxaCartao,
    valorImposto,
    valorComissao,
    totalDeducoes,
    recebidoLiquido,
    lucroLiquido,
    margemLiquidaPct,
    cmvPctSobrePreco,
  };
}

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(valor) ? valor : 0
  );
}

export function formatarNumero(valor: number, decimais = 1): string {
  return (Number.isFinite(valor) ? valor : 0).toFixed(decimais).replace(".", ",");
}

export function formatarPercentual(valor: number, decimais = 1): string {
  return `${formatarNumero(valor, decimais)}%`;
}

export function formatarCodigo(prefixo: "INS" | "REC" | "PRT", codigo: number): string {
  return `${prefixo}-${String(codigo).padStart(4, "0")}`;
}

export type MacroFonte = "taco" | "tbca" | "rotulo" | "manual";

export const MACRO_FONTE_LABEL: Record<MacroFonte, string> = {
  taco: "TACO",
  tbca: "TBCA",
  rotulo: "Rótulo do fabricante",
  manual: "Estimativa manual",
};

export type SaudeMargemStatus = "prejuizo" | "apertada" | "ok" | "saudavel" | "excelente";

export function classificarSaudeMargem(margemLiquidaPct: number): { status: SaudeMargemStatus; label: string } {
  if (margemLiquidaPct < 0) return { status: "prejuizo", label: "Prejuízo" };
  if (margemLiquidaPct < 15) return { status: "apertada", label: "Apertada" };
  if (margemLiquidaPct < 25) return { status: "ok", label: "Ok" };
  if (margemLiquidaPct < 40) return { status: "saudavel", label: "Saudável" };
  return { status: "excelente", label: "Excelente" };
}
