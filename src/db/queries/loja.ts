import { unstable_cache } from "next/cache";
import { and, asc, eq, gt, isNotNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { kits, pratos, pratoReceitas, receitas, zonasEntrega } from "@/db/schema";
import { mapaResumoReceitas } from "@/db/queries/receitas";
import { escalarMacros, somarMacrosLista, MACRO_ZERO } from "@/lib/calculations";
import type { KitVitrine, PratoVitrine } from "@/lib/vitrine";

/** Um prato só aparece na loja se está publicado, tem preço e tem o que entregar. */
const FILTRO_VITRINE = and(
  eq(pratos.publicado, true),
  isNotNull(pratos.precoVendaCentavos),
  ne(pratos.disponibilidade, "indisponivel"),
  or(ne(pratos.disponibilidade, "estoque"), gt(pratos.estoqueUnidades, 0))
);

type LinhaItem = { pratoId: string; receitaId: string; quantidadeG: number };

function montarVitrine(
  linha: typeof pratos.$inferSelect,
  itens: LinhaItem[],
  resumos: Awaited<ReturnType<typeof mapaResumoReceitas>>
): PratoVitrine {
  const comResumo = itens.map((item) => ({ item, resumo: resumos.get(item.receitaId) }));

  const macros = somarMacrosLista(
    comResumo.map(({ item, resumo }) =>
      resumo ? escalarMacros(resumo.macrosTotal, resumo.rendimentoTotalG, item.quantidadeG) : MACRO_ZERO
    )
  );

  return {
    id: linha.id,
    codigo: linha.codigo,
    nome: linha.nome,
    // O filtro garante prato publicado, e publicar exige slug.
    slug: linha.slug!,
    descricao: linha.descricao,
    fotoUrl: linha.fotoUrl,
    categoria: linha.categoria,
    precoVendaCentavos: linha.precoVendaCentavos!,
    pesoTotalG: itens.reduce((acc, i) => acc + i.quantidadeG, 0),
    macros,
    temGluten: comResumo.some(({ resumo }) => resumo?.temGluten ?? false),
    temLactose: comResumo.some(({ resumo }) => resumo?.temLactose ?? false),
    estoqueLimitado: linha.disponibilidade === "estoque",
    estoqueUnidades: linha.estoqueUnidades,
  };
}

/**
 * Etiqueta de cache da vitrine. As ações do admin chamam revalidateTag com ela
 * ao salvar um prato, para que publicar apareça na loja na hora em vez de
 * esperar o tempo de revalidação.
 */
export const TAG_VITRINE = "vitrine";
const REVALIDAR_SEGUNDOS = 300;

/** Cardápio completo, em 3 consultas fixas independente de quantos pratos existam. */
async function consultarPratosVitrine(): Promise<PratoVitrine[]> {
  const [linhas, itens, resumos] = await Promise.all([
    db.select().from(pratos).where(FILTRO_VITRINE).orderBy(asc(pratos.nome)),
    db
      .select({
        pratoId: pratoReceitas.pratoId,
        receitaId: pratoReceitas.receitaId,
        quantidadeG: pratoReceitas.quantidadeG,
      })
      .from(pratoReceitas)
      .innerJoin(receitas, eq(receitas.id, pratoReceitas.receitaId))
      .orderBy(asc(pratoReceitas.ordem)),
    mapaResumoReceitas(),
  ]);

  const itensPorPrato = new Map<string, LinhaItem[]>();
  for (const item of itens) {
    const lista = itensPorPrato.get(item.pratoId);
    if (lista) lista.push(item);
    else itensPorPrato.set(item.pratoId, [item]);
  }

  return linhas.map((linha) => montarVitrine(linha, itensPorPrato.get(linha.id) ?? [], resumos));
}

/**
 * Consulta cacheada em vez de página prerenderizada: a loja não paga uma ida ao
 * banco por visita, e o build não depende de o banco estar de pé.
 */
export const listarPratosVitrine = unstable_cache(consultarPratosVitrine, ["vitrine-lista"], {
  revalidate: REVALIDAR_SEGUNDOS,
  tags: [TAG_VITRINE],
});

async function consultarPratoPorSlug(slug: string): Promise<PratoVitrine | null> {
  const [linha] = await db
    .select()
    .from(pratos)
    .where(and(eq(pratos.slug, slug), FILTRO_VITRINE))
    .limit(1);
  if (!linha) return null;

  const [itens, resumos] = await Promise.all([
    db
      .select({
        pratoId: pratoReceitas.pratoId,
        receitaId: pratoReceitas.receitaId,
        quantidadeG: pratoReceitas.quantidadeG,
      })
      .from(pratoReceitas)
      .where(eq(pratoReceitas.pratoId, linha.id))
      .orderBy(asc(pratoReceitas.ordem)),
    mapaResumoReceitas(),
  ]);

  return montarVitrine(linha, itens, resumos);
}

export const buscarPratoVitrinePorSlug = unstable_cache(consultarPratoPorSlug, ["vitrine-prato"], {
  revalidate: REVALIDAR_SEGUNDOS,
  tags: [TAG_VITRINE],
});

export interface BairroAtendido {
  bairro: string;
  zonaNome: string;
  freteCentavos: number;
  freteGratisAcimaCentavos: number | null;
}

/** Bairros atendidos, achatados a partir das zonas ativas, para o checkout. */
async function consultarBairrosAtendidos(): Promise<BairroAtendido[]> {
  const zonas = await db
    .select()
    .from(zonasEntrega)
    .where(eq(zonasEntrega.ativa, true))
    .orderBy(asc(zonasEntrega.ordem));

  return zonas
    .flatMap((z) =>
      z.bairros.map((bairro) => ({
        bairro,
        zonaNome: z.nome,
        freteCentavos: z.freteCentavos,
        freteGratisAcimaCentavos: z.freteGratisAcimaCentavos,
      }))
    )
    .sort((a, b) => a.bairro.localeCompare(b.bairro, "pt-BR"));
}

export const listarBairrosAtendidos = unstable_cache(consultarBairrosAtendidos, ["bairros-atendidos"], {
  revalidate: REVALIDAR_SEGUNDOS,
  tags: [TAG_VITRINE],
});

/** Kits publicados, na ordem definida pelo admin. */
async function consultarKitsVitrine(): Promise<KitVitrine[]> {
  return db
    .select({
      id: kits.id,
      codigo: kits.codigo,
      nome: kits.nome,
      slug: kits.slug,
      descricao: kits.descricao,
      quantidadePratos: kits.quantidadePratos,
      precoCentavos: kits.precoCentavos,
    })
    .from(kits)
    .where(and(eq(kits.publicado, true), eq(kits.ativo, true)))
    .orderBy(asc(kits.ordem), asc(kits.precoCentavos));
}

export const listarKitsVitrine = unstable_cache(consultarKitsVitrine, ["vitrine-kits"], {
  revalidate: REVALIDAR_SEGUNDOS,
  tags: [TAG_VITRINE],
});

async function consultarKitPorSlug(slug: string): Promise<KitVitrine | null> {
  const lista = await consultarKitsVitrine();
  return lista.find((k) => k.slug === slug) ?? null;
}

export const buscarKitVitrinePorSlug = unstable_cache(consultarKitPorSlug, ["vitrine-kit"], {
  revalidate: REVALIDAR_SEGUNDOS,
  tags: [TAG_VITRINE],
});
