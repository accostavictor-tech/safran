/**
 * Simulação de preço por prato para atingir o piso de margem de contribuição.
 *
 * Usa as MESMAS funções da aplicação (a consulta de pratos e `lib/calculations`),
 * de propósito: uma planilha paralela com a fórmula recopiada é exatamente como
 * o preço sugerido e a margem real passaram a divergir.
 *
 * Roda com: npx tsx scripts/simular-precos.mts [--margem 45] [--json]
 */
import { readFileSync } from "node:fs";

// .env.local não é lido automaticamente fora do next.
for (const linha of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = linha.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "");
}

const { listarPratosComPrecificacao } = await import("../src/db/queries/pratos");
const { calcularPrecoParaMargem, analisarPreco, PISO_MARGEM_CONTRIBUICAO_PCT } = await import("../src/lib/calculations");

const args = process.argv.slice(2);
const margemAlvo = Number(args[args.indexOf("--margem") + 1]) || PISO_MARGEM_CONTRIBUICAO_PCT;
const comoJson = args.includes("--json");

/**
 * Preço de prateleira termina em ,90 — é o padrão do portfólio atual
 * (R$ 26,90 a R$ 32,90). Arredonda sempre para cima: para baixo derrubaria a
 * margem abaixo do piso que a simulação existe para garantir.
 */
function arredondarParaNoventa(valor: number): number {
  const centavos = Math.ceil(valor * 100);
  const inteiro = Math.floor(centavos / 100);
  return centavos <= inteiro * 100 + 90 ? inteiro + 0.9 : inteiro + 1.9;
}

const linhas = await listarPratosComPrecificacao();

/** Um cenário = um conjunto de deduções variáveis sobre o preço. */
const CENARIOS = [
  {
    chave: "atual",
    titulo: "A — parâmetros como estão na ficha (cartão + imposto + comissão)",
    comissao: (comissaoDaFicha: number) => comissaoDaFicha,
  },
  {
    chave: "proprio",
    titulo: "B — canal próprio, sem comissão de marketplace",
    comissao: () => 0,
  },
];

const resultado = CENARIOS.map((cenario) => {
  const pratos = linhas.map(({ prato, precificacao, custoProducao }) => {
    const custoTotal = custoProducao + prato.custoEmbalagem;
    const taxas = {
      taxaCartao: prato.taxaCartao,
      imposto: prato.imposto,
      comissao: cenario.comissao(prato.comissao),
    };
    const exato = calcularPrecoParaMargem(custoTotal, taxas, margemAlvo);
    const arredondado = arredondarParaNoventa(exato);
    const atual = prato.precoVendaCentavos !== null ? prato.precoVendaCentavos / 100 : null;

    return {
      codigo: prato.codigo,
      nome: prato.nome,
      custoTotal,
      taxas,
      deducoesPct: taxas.taxaCartao + taxas.imposto + taxas.comissao,
      precoFormula: precificacao.precoVenda,
      precoExato: exato,
      precoSugerido: arredondado,
      margemNoSugerido: analisarPreco(arredondado, custoTotal, taxas).margemLiquidaPct,
      precoAtual: atual,
      margemAtual: atual !== null ? analisarPreco(atual, custoTotal, taxas).margemLiquidaPct : null,
    };
  });

  return { ...cenario, pratos };
});

/**
 * Faixas de preço propostas. Uma tabela com 19 preços distintos não se
 * comunica nem se mantém; poucas faixas, sim. Cada prato entra na primeira
 * faixa que cobre o preço mínimo dele — se nenhuma cobrir, sai destacado.
 */
const FAIXAS = [
  { nome: "Cardápio", preco: 28.9 },
  { nome: "Especial", preco: 38.9 },
  { nome: "Premium", preco: 46.9 },
];

function faixaDe(precoMinimo: number) {
  return FAIXAS.find((f) => f.preco >= precoMinimo) ?? null;
}

if (comoJson) {
  console.log(JSON.stringify({ margemAlvo, faixas: FAIXAS, cenarios: resultado }, null, 2));
} else {
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  for (const c of resultado) {
    const deducoes = c.pratos[0]?.deducoesPct ?? 0;
    console.log(`\n${c.titulo}  ·  deduções ${deducoes.toFixed(0)}%  ·  alvo ${margemAlvo}%\n`);
    console.table(
      c.pratos
        .slice()
        .sort((a, b) => a.codigo - b.codigo)
        .map((p) => ({
          cód: `PRT-${String(p.codigo).padStart(4, "0")}`,
          prato: p.nome.length > 40 ? `${p.nome.slice(0, 39)}…` : p.nome,
          custo: brl(p.custoTotal),
          "fórmula hoje": brl(p.precoFormula),
          "p/ alvo": brl(p.precoExato),
          "preço ,90": brl(p.precoSugerido),
          "margem aí": `${p.margemNoSugerido.toFixed(1)}%`,
        }))
    );
    const medio = c.pratos.reduce((a, p) => a + p.precoSugerido, 0) / c.pratos.length;
    console.log(`preço médio sugerido: ${brl(medio)}`);
  }

  // As faixas só fazem sentido no cenário do canal próprio: é o que a loja é.
  const canalProprio = resultado.find((c) => c.chave === "proprio")!;
  console.log(`\nFaixas de preço no canal próprio (alvo ${margemAlvo}%)\n`);
  console.table(
    canalProprio.pratos
      .slice()
      .sort((a, b) => a.precoSugerido - b.precoSugerido)
      .map((p) => {
        const faixa = faixaDe(p.precoSugerido);
        return {
          cód: `PRT-${String(p.codigo).padStart(4, "0")}`,
          prato: p.nome.length > 40 ? `${p.nome.slice(0, 39)}…` : p.nome,
          "mínimo p/ piso": brl(p.precoSugerido),
          faixa: faixa ? faixa.nome : "ACIMA DE TODAS",
          "preço da faixa": faixa ? brl(faixa.preco) : "—",
          "margem na faixa": faixa
            ? `${analisarPreco(faixa.preco, p.custoTotal, p.taxas).margemLiquidaPct.toFixed(1)}%`
            : "—",
        };
      })
  );
}

process.exit(0);
