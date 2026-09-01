import { eq, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { insumos, receitaInsumos } from "@/db/schema";

export async function listarInsumosComContagem() {
  const contagem = db
    .select({
      insumoId: receitaInsumos.insumoId,
      total: sql<number>`count(distinct ${receitaInsumos.receitaId})`.as("total"),
    })
    .from(receitaInsumos)
    .groupBy(receitaInsumos.insumoId)
    .as("contagem");

  return db
    .select({
      insumo: insumos,
      receitasCount: sql<number>`coalesce(${contagem.total}, 0)`,
    })
    .from(insumos)
    .leftJoin(contagem, eq(contagem.insumoId, insumos.id))
    .orderBy(asc(insumos.nome));
}

export async function buscarInsumo(id: string) {
  const [insumo] = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  return insumo ?? null;
}

export async function listarInsumosParaSelecao() {
  return db
    .select({
      id: insumos.id,
      nome: insumos.nome,
      unidadeMedida: insumos.unidadeMedida,
      custo: insumos.custo,
      fatorCorrecao: insumos.fatorCorrecao,
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
    .from(insumos)
    .orderBy(asc(insumos.nome));
}
