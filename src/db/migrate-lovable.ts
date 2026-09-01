/**
 * Migração pontual dos dados exportados do sistema anterior (Lovable / "Tabela Fácil").
 *
 * Uso:
 *   npm run db:import-lovable -- /caminho/para/pasta/com/os/csvs [--reset]
 *   npm run db:import-lovable -- /caminho/para/pasta/com/os/csvs --emit-json /caminho/saida.json
 *
 * Espera os CSVs exportados do Supabase (delimitador ";"), com os nomes padrão de
 * exportação: ingredientes-export*.csv, fichas_tecnicas-export*.csv,
 * ficha_ingredientes-export*.csv, rotulos-export*.csv, rotulo_fichas-export*.csv,
 * ingrediente_preco_historico-export*.csv. Os demais arquivos do export
 * (ficha_custo_historico) não têm equivalente neste sistema e são ignorados.
 *
 * Preserva os UUIDs originais como chave primária, então as relações
 * (ficha_ingredientes -> receita_insumos, rotulo_fichas -> prato_receitas)
 * continuam íntegras sem precisar remapear ids.
 *
 * `--emit-json` não toca no banco: só lê os CSVs, monta os dados já no
 * formato das tabelas novas e escreve um JSON — útil quando o banco de
 * produção não está acessível a partir de onde este script roda (ex.: via
 * uma rota HTTP que faz a inserção de fato).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { sql } from "drizzle-orm";
import { db } from "./index";
import { insumos, insumoPrecoHistorico, receitas, receitaInsumos, pratos, pratoReceitas } from "./schema";

function acharArquivo(pasta: string, prefixo: string): string | null {
  const candidatos = readdirSync(pasta)
    .filter((f) => f.startsWith(prefixo) && f.endsWith(".csv"))
    .sort();
  if (candidatos.length === 0) return null;
  return join(pasta, candidatos[candidatos.length - 1]);
}

function lerCsv(caminho: string): Record<string, string>[] {
  const conteudo = readFileSync(caminho, "utf-8");
  return parse(conteudo, { columns: true, delimiter: ";", relax_quotes: true, skip_empty_lines: true });
}

function num(v: string | undefined, fallback = 0): number {
  if (v === undefined || v === null || v.trim() === "") return fallback;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: string | undefined): boolean {
  return v?.trim().toLowerCase() === "true";
}

function timestamp(v: string | undefined): Date {
  if (!v) return new Date();
  // "2026-01-10 21:48:12.150628+00" -> ISO parseável
  const normalizado = v.trim().replace(" ", "T").replace(/(\.\d{3})\d*/, "$1").replace(/\+00$/, "Z");
  const d = new Date(normalizado);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function alergenicos(v: string | undefined): { temGluten: boolean; temLactose: boolean; outros: string[] } {
  if (!v) return { temGluten: false, temLactose: false, outros: [] };
  try {
    const lista: string[] = JSON.parse(v);
    const temGluten = lista.some((a) => a.toLowerCase().includes("glúten") || a.toLowerCase().includes("gluten"));
    const temLactose = lista.some((a) => a.toLowerCase().includes("lactose"));
    const outros = lista.filter(
      (a) => !a.toLowerCase().includes("glúten") && !a.toLowerCase().includes("gluten") && !a.toLowerCase().includes("lactose")
    );
    return { temGluten, temLactose, outros };
  } catch {
    return { temGluten: false, temLactose: false, outros: [] };
  }
}

function montarDados(pasta: string) {
  const avisos: string[] = [];

  // 1. Insumos
  const arqIngredientes = acharArquivo(pasta, "ingredientes-export");
  if (!arqIngredientes) throw new Error("Não achei ingredientes-export*.csv na pasta.");
  const linhasIngredientes = lerCsv(arqIngredientes);

  let ovoCount = 0;
  const outrosAlergenicosVistos = new Set<string>();

  const dadosInsumos = linhasIngredientes.map((r) => {
    const { temGluten, temLactose, outros } = alergenicos(r.alergenicos);
    outros.forEach((o) => outrosAlergenicosVistos.add(o));
    if (outros.length > 0) ovoCount++;

    return {
      id: r.id,
      nome: r.nome_exibicao?.trim() || r.nome,
      unidadeMedida: (r.unidade_medida === "kg" ? "g" : r.unidade_medida === "l" ? "ml" : r.unidade_medida) as
        | "g"
        | "ml"
        | "un",
      custo: r.unidade_medida === "kg" || r.unidade_medida === "l" ? num(r.preco_unitario) / 10 : num(r.preco_unitario),
      fatorCorrecao: num(r.fator_correcao, 1),
      temGluten,
      temLactose,
      energiaKcal: num(r.energia_kcal),
      carboidratos: num(r.carboidratos),
      acucaresTotais: num(r.acucares_totais),
      proteinas: num(r.proteinas),
      gordurasTotais: num(r.gorduras_totais),
      gordurasSaturadas: num(r.gorduras_saturadas),
      gordurasTrans: num(r.gorduras_trans),
      fibraAlimentar: num(r.fibra_alimentar),
      sodio: num(r.sodio),
      createdAt: timestamp(r.created_at),
      updatedAt: timestamp(r.updated_at),
    };
  });
  if (ovoCount > 0) {
    avisos.push(
      `${ovoCount} insumo(s) tinham alergênico "${[...outrosAlergenicosVistos].join(", ")}" no sistema antigo — este sistema só rastreia glúten/lactose, essa marcação não foi migrada.`
    );
  }

  // 2. Histórico de preço dos insumos
  const arqHistPreco = acharArquivo(pasta, "ingrediente_preco_historico-export");
  const dadosHistPreco = arqHistPreco
    ? lerCsv(arqHistPreco).map((r) => ({
        id: r.id,
        insumoId: r.ingrediente_id,
        precoAnterior: num(r.preco_anterior),
        precoNovo: num(r.preco_novo),
        createdAt: timestamp(r.created_at),
      }))
    : [];

  // 3. Receitas
  const arqFichas = acharArquivo(pasta, "fichas_tecnicas-export");
  if (!arqFichas) throw new Error("Não achei fichas_tecnicas-export*.csv na pasta.");
  const dadosReceitas = lerCsv(arqFichas).map((r) => ({
    id: r.id,
    nome: r.nome,
    rendimentoTotalG: num(r.rendimento_total_g),
    pesoPorcaoG: num(r.peso_porcao_g),
    modoPreparo: r.modo_preparo || "",
    ativa: bool(r.ativa),
    createdAt: timestamp(r.created_at),
    updatedAt: timestamp(r.updated_at),
  }));

  // 4. Insumos de cada receita
  const arqFichaIng = acharArquivo(pasta, "ficha_ingredientes-export");
  if (!arqFichaIng) throw new Error("Não achei ficha_ingredientes-export*.csv na pasta.");
  const linhasFichaIng = lerCsv(arqFichaIng);
  const ordemPorFicha = new Map<string, number>();
  let zerados = 0;
  const dadosReceitaInsumos = linhasFichaIng.map((r) => {
    const ordem = ordemPorFicha.get(r.ficha_id) ?? 0;
    ordemPorFicha.set(r.ficha_id, ordem + 1);
    const quantidade = num(r.quantidade_liquida);
    if (quantidade <= 0) zerados++;

    return {
      id: r.id,
      receitaId: r.ficha_id,
      insumoId: r.ingrediente_id,
      quantidadeLiquida: quantidade,
      ordem,
    };
  });
  if (zerados > 0) {
    avisos.push(`${zerados} item(ns) de receita com quantidade zerada no sistema antigo (provavelmente "a gosto") — importados como 0.`);
  }

  // 5. Pratos (equivalentes aos antigos "rótulos")
  const arqRotulos = acharArquivo(pasta, "rotulos-export");
  const dadosPratos = arqRotulos
    ? lerCsv(arqRotulos).map((r) => ({
        id: r.id,
        nome: r.nome,
        custoEmbalagem: num(r.custo_embalagem),
        margemLucro: num(r.margem_lucro, 45),
        taxaCartao: num(r.taxa_cartao),
        imposto: num(r.imposto),
        comissao: num(r.comissao),
        ativo: true,
        createdAt: timestamp(r.created_at),
        updatedAt: timestamp(r.updated_at),
      }))
    : [];

  // 6. Receitas de cada prato
  const arqRotuloFichas = acharArquivo(pasta, "rotulo_fichas-export");
  const ordemPorPrato = new Map<string, number>();
  const dadosPratoReceitas = arqRotuloFichas
    ? lerCsv(arqRotuloFichas).map((r) => {
        const ordem = ordemPorPrato.get(r.rotulo_id) ?? 0;
        ordemPorPrato.set(r.rotulo_id, ordem + 1);
        return {
          id: r.id,
          pratoId: r.rotulo_id,
          receitaId: r.ficha_id,
          quantidadeG: num(r.quantidade),
          ordem,
        };
      })
    : [];

  return {
    insumos: dadosInsumos,
    insumoPrecoHistorico: dadosHistPreco,
    receitas: dadosReceitas,
    receitaInsumos: dadosReceitaInsumos,
    pratos: dadosPratos,
    pratoReceitas: dadosPratoReceitas,
    avisos,
  };
}

async function main() {
  const pasta = process.argv[2];
  const reset = process.argv.includes("--reset");
  const emitIdx = process.argv.indexOf("--emit-json");
  const emitPath = emitIdx >= 0 ? process.argv[emitIdx + 1] : null;

  if (!pasta) {
    console.error("Uso: npm run db:import-lovable -- /caminho/para/pasta/com/os/csvs [--reset | --emit-json <arquivo>]");
    process.exit(1);
  }

  const dados = montarDados(pasta);

  if (emitPath) {
    writeFileSync(emitPath, JSON.stringify(dados));
    console.log(`✓ JSON escrito em ${emitPath} (não tocou no banco).`);
    dados.avisos.forEach((a) => console.log(`  Aviso: ${a}`));
    process.exit(0);
  }

  if (reset) {
    console.log("Limpando insumos, receitas e pratos existentes (--reset)...");
    await db.execute(
      sql`truncate table prato_receitas, pratos, receita_insumos, receitas, insumo_preco_historico, insumos cascade`
    );
  } else {
    const [{ count: countInsumos }] = await db.select({ count: sql<number>`count(*)` }).from(insumos);
    if (Number(countInsumos) > 0) {
      console.error(
        `Já existem ${countInsumos} insumos cadastrados. Rode de novo com --reset se quiser apagar tudo e reimportar, ou limpe manualmente antes.`
      );
      process.exit(1);
    }
  }

  await db.insert(insumos).values(dados.insumos);
  console.log(`✓ ${dados.insumos.length} insumos importados.`);

  if (dados.insumoPrecoHistorico.length) {
    await db.insert(insumoPrecoHistorico).values(dados.insumoPrecoHistorico);
    console.log(`✓ ${dados.insumoPrecoHistorico.length} registros de histórico de preço importados.`);
  }

  await db.insert(receitas).values(dados.receitas);
  console.log(`✓ ${dados.receitas.length} receitas importadas.`);

  await db.insert(receitaInsumos).values(dados.receitaInsumos);
  console.log(`✓ ${dados.receitaInsumos.length} itens de receita importados.`);

  if (dados.pratos.length) {
    await db.insert(pratos).values(dados.pratos);
    console.log(`✓ ${dados.pratos.length} pratos importados.`);
  }
  if (dados.pratoReceitas.length) {
    await db.insert(pratoReceitas).values(dados.pratoReceitas);
    console.log(`✓ ${dados.pratoReceitas.length} composições de prato importadas.`);
  }

  dados.avisos.forEach((a) => console.log(`  Aviso: ${a}`));
  console.log("\nMigração concluída.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Falha na migração:", err);
  process.exit(1);
});
