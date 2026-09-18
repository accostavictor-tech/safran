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

export interface TaxasVariaveis {
  taxaCartao: number; // %
  imposto: number; // %
  comissao: number; // %
}

/**
 * Dado um preço de venda e o custo total, calcula deduções, lucro e margens.
 * É o núcleo compartilhado: tanto "margem-alvo -> preço sugerido" quanto
 * "preço cobrado -> margem realizada" passam por aqui, para que não existam
 * duas fórmulas de margem divergindo no sistema.
 */
export function analisarPreco(
  precoVenda: number,
  custoTotal: number,
  taxas: TaxasVariaveis
): PrecificacaoResultado {
  const valorTaxaCartao = precoVenda * (taxas.taxaCartao / 100);
  const valorImposto = precoVenda * (taxas.imposto / 100);
  const valorComissao = precoVenda * (taxas.comissao / 100);
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

/**
 * Mesma fórmula usada no sistema anterior:
 * 1. Preço = (custo produção + embalagem) / (1 - margem bruta%)
 * 2. Cartão, imposto e comissão são descontados sobre o preço de venda
 * 3. Lucro líquido = preço - deduções - custo total
 *
 * O resultado é uma SUGESTÃO. O preço que o cliente paga é o
 * `precoVendaCentavos` do prato, definido por uma pessoa.
 */
export function calcularPrecificacao(input: PrecificacaoInput): PrecificacaoResultado {
  const custoTotal = input.custoProducao + input.custoEmbalagem;
  const margemDecimal = input.margemLucro / 100;
  const margemValida = margemDecimal < 1;

  const precoVenda = margemValida && custoTotal > 0 ? custoTotal / (1 - margemDecimal) : 0;

  return analisarPreco(precoVenda, custoTotal, input);
}

export interface MargemRealizadaInput extends TaxasVariaveis {
  precoVenda: number; // o preço efetivamente cobrado
  custoProducao: number;
  custoEmbalagem: number;
}

/** Margem real de um preço já decidido — o inverso de `calcularPrecificacao`. */
export function calcularMargemRealizada(input: MargemRealizadaInput): PrecificacaoResultado {
  return analisarPreco(input.precoVenda, input.custoProducao + input.custoEmbalagem, input);
}

/**
 * Piso de margem de contribuição por item, formalizado pela empresa.
 * `margemLiquidaPct` deste módulo já é a margem de contribuição: desconta do
 * preço todos os custos variáveis (produção, embalagem, cartão, imposto,
 * comissão) e nada de custo fixo.
 */
export const PISO_MARGEM_CONTRIBUICAO_PCT = 45;

export function abaixoDoPiso(margemLiquidaPct: number): boolean {
  return margemLiquidaPct < PISO_MARGEM_CONTRIBUICAO_PCT;
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

export function formatarCodigo(prefixo: "INS" | "REC" | "PRT" | "PED", codigo: number): string {
  return `${prefixo}-${String(codigo).padStart(4, "0")}`;
}

// --- Dinheiro ---
// Valor cobrado de cliente trafega e é gravado como inteiro em centavos.
// Conta em float aqui gera divergência de centavo na conciliação com o
// provedor de pagamento.

export function reaisParaCentavos(reais: number): number {
  return Math.round(reais * 100);
}

export function centavosParaReais(centavos: number): number {
  return centavos / 100;
}

export function formatarCentavos(centavos: number): string {
  return formatarMoeda(centavos / 100);
}

export type TipoInsumo = "in_natura" | "industrializado";

export const TIPO_INSUMO_LABEL: Record<TipoInsumo, string> = {
  in_natura: "In natura",
  industrializado: "Industrializado",
};

export type MacroFonte = "taco" | "tbca" | "fabricante";

export const MACRO_FONTE_LABEL: Record<MacroFonte, string> = {
  taco: "TACO",
  tbca: "TBCA",
  fabricante: "Fabricante (rótulo)",
};

/** Fontes válidas de macronutrientes para cada tipo de insumo. */
export const FONTES_POR_TIPO: Record<TipoInsumo, MacroFonte[]> = {
  in_natura: ["taco", "tbca"],
  industrializado: ["fabricante"],
};

export type SaudeMargemStatus = "prejuizo" | "apertada" | "abaixo_piso" | "saudavel" | "excelente";

/** Escala ancorada no piso de contribuição da empresa, para que rótulo e alerta nunca se contradigam. */
export function classificarSaudeMargem(margemLiquidaPct: number): { status: SaudeMargemStatus; label: string } {
  if (margemLiquidaPct < 0) return { status: "prejuizo", label: "Prejuízo" };
  if (margemLiquidaPct < 30) return { status: "apertada", label: "Apertada" };
  if (margemLiquidaPct < PISO_MARGEM_CONTRIBUICAO_PCT) return { status: "abaixo_piso", label: "Abaixo do piso" };
  if (margemLiquidaPct < 55) return { status: "saudavel", label: "Saudável" };
  return { status: "excelente", label: "Excelente" };
}

/**
 * Preço que entrega exatamente a margem de contribuição desejada.
 *
 * Diferente de `calcularPrecificacao`, que usa margem BRUTA
 * (custo / (1 - margem)) e por isso fica abaixo do alvo sempre que existe
 * taxa de cartão, imposto ou comissão — as deduções saem depois. Aqui o alvo
 * é a margem líquida de verdade:
 *   margem = 1 - taxas - custo/P   =>   P = custo / (1 - taxas - margem)
 */
export function calcularPrecoParaMargem(
  custoTotal: number,
  taxas: TaxasVariaveis,
  margemAlvoPct: number
): number {
  const taxasDecimal = (taxas.taxaCartao + taxas.imposto + taxas.comissao) / 100;
  const divisor = 1 - taxasDecimal - margemAlvoPct / 100;
  if (divisor <= 0 || custoTotal <= 0) return 0;
  return custoTotal / divisor;
}
