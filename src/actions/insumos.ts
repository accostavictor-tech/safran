"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { insumos, insumoPrecoHistorico } from "@/db/schema";

const CAMPOS_MACRO = [
  "energiaKcal",
  "carboidratos",
  "acucaresTotais",
  "proteinas",
  "gordurasTotais",
  "gordurasSaturadas",
  "gordurasTrans",
  "fibraAlimentar",
  "sodio",
] as const;

const insumoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  unidadeMedida: z.enum(["g", "ml", "un"]),
  custo: z.coerce.number().min(0, "Custo não pode ser negativo."),
  fatorCorrecao: z.coerce.number().min(0.01, "Fator de correção deve ser maior que zero."),
  temGluten: z.coerce.boolean().default(false),
  temLactose: z.coerce.boolean().default(false),
  energiaKcal: z.coerce.number().optional().nullable(),
  carboidratos: z.coerce.number().optional().nullable(),
  acucaresTotais: z.coerce.number().optional().nullable(),
  proteinas: z.coerce.number().optional().nullable(),
  gordurasTotais: z.coerce.number().optional().nullable(),
  gordurasSaturadas: z.coerce.number().optional().nullable(),
  gordurasTrans: z.coerce.number().optional().nullable(),
  fibraAlimentar: z.coerce.number().optional().nullable(),
  sodio: z.coerce.number().optional().nullable(),
  macroFonte: z.enum(["taco", "tbca", "rotulo", "manual"]).optional().nullable(),
});

type InsumoParsed = z.infer<typeof insumoSchema>;

export interface InsumoFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const numOrNull = (v: FormDataEntryValue | null) =>
    v === null || v === "" ? null : v;
  const strOrNull = (v: FormDataEntryValue | null) => (v === null || v === "" ? null : v);

  return {
    nome: formData.get("nome"),
    unidadeMedida: formData.get("unidadeMedida"),
    custo: formData.get("custo"),
    fatorCorrecao: formData.get("fatorCorrecao") || "1",
    temGluten: formData.get("temGluten") === "on",
    temLactose: formData.get("temLactose") === "on",
    energiaKcal: numOrNull(formData.get("energiaKcal")),
    carboidratos: numOrNull(formData.get("carboidratos")),
    acucaresTotais: numOrNull(formData.get("acucaresTotais")),
    proteinas: numOrNull(formData.get("proteinas")),
    gordurasTotais: numOrNull(formData.get("gordurasTotais")),
    gordurasSaturadas: numOrNull(formData.get("gordurasSaturadas")),
    gordurasTrans: numOrNull(formData.get("gordurasTrans")),
    fibraAlimentar: numOrNull(formData.get("fibraAlimentar")),
    sodio: numOrNull(formData.get("sodio")),
    macroFonte: strOrNull(formData.get("macroFonte")),
  };
}

/** true se algum campo de macro ou a fonte mudou em relação ao registro atual. */
function macrosMudaram(atual: typeof insumos.$inferSelect, novo: InsumoParsed): boolean {
  if ((atual.macroFonte ?? null) !== (novo.macroFonte ?? null)) return true;
  return CAMPOS_MACRO.some((campo) => (atual[campo] ?? null) !== (novo[campo] ?? null));
}

export async function criarInsumoAction(
  _prevState: InsumoFormState,
  formData: FormData
): Promise<InsumoFormState> {
  const parsed = insumoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  await db.insert(insumos).values({
    ...parsed.data,
    macroRevisadoEm: parsed.data.macroFonte ? new Date() : null,
  });
  revalidatePath("/insumos");
  redirect("/insumos?toast=criado");
}

export async function atualizarInsumoAction(
  id: string,
  _prevState: InsumoFormState,
  formData: FormData
): Promise<InsumoFormState> {
  const parsed = insumoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const [atual] = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  if (!atual) {
    return { erro: "Insumo não encontrado." };
  }

  const macroRevisadoEm = macrosMudaram(atual, parsed.data) ? new Date() : atual.macroRevisadoEm;

  await db
    .update(insumos)
    .set({ ...parsed.data, macroRevisadoEm, updatedAt: new Date() })
    .where(eq(insumos.id, id));

  if (atual.custo !== parsed.data.custo) {
    await db.insert(insumoPrecoHistorico).values({
      insumoId: id,
      precoAnterior: atual.custo,
      precoNovo: parsed.data.custo,
    });
  }

  revalidatePath("/insumos");
  revalidatePath(`/insumos/${id}`);
  redirect("/insumos?toast=atualizado");
}

export async function excluirInsumoAction(id: string) {
  try {
    await db.delete(insumos).where(eq(insumos.id, id));
  } catch {
    // Provavelmente em uso por alguma receita (restrição de chave estrangeira).
    return;
  }
  revalidatePath("/insumos");
}
