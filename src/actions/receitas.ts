"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { receitas, receitaInsumos } from "@/db/schema";

const itemSchema = z.object({
  insumoId: z.string().uuid(),
  quantidadeLiquida: z.coerce.number().min(0.001, "Quantidade deve ser maior que zero."),
});

const receitaSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  rendimentoTotalG: z.coerce.number().min(0.01, "Rendimento deve ser maior que zero."),
  pesoPorcaoG: z.coerce.number().min(0.01, "Peso da porção deve ser maior que zero."),
  modoPreparo: z.string().optional().default(""),
  ativa: z.coerce.boolean().default(true),
  itens: z
    .string()
    .transform((s, ctx) => {
      try {
        const parsed = JSON.parse(s);
        return z.array(itemSchema).min(1, "Adicione ao menos um insumo.").parse(parsed);
      } catch {
        ctx.addIssue({ code: "custom", message: "Lista de insumos inválida." });
        return z.NEVER;
      }
    }),
});

export interface ReceitaFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  return {
    nome: formData.get("nome"),
    rendimentoTotalG: formData.get("rendimentoTotalG"),
    pesoPorcaoG: formData.get("pesoPorcaoG"),
    modoPreparo: formData.get("modoPreparo") ?? "",
    ativa: formData.get("ativa") === "on",
    itens: formData.get("itens") ?? "[]",
  };
}

async function salvarItens(receitaId: string, itens: { insumoId: string; quantidadeLiquida: number }[]) {
  await db.delete(receitaInsumos).where(eq(receitaInsumos.receitaId, receitaId));
  if (itens.length === 0) return;
  await db.insert(receitaInsumos).values(
    itens.map((item, idx) => ({
      receitaId,
      insumoId: item.insumoId,
      quantidadeLiquida: item.quantidadeLiquida,
      ordem: idx,
    }))
  );
}

export async function criarReceitaAction(
  _prevState: ReceitaFormState,
  formData: FormData
): Promise<ReceitaFormState> {
  const parsed = receitaSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { itens, ...dados } = parsed.data;

  const [nova] = await db.insert(receitas).values(dados).returning({ id: receitas.id });
  await salvarItens(nova.id, itens);

  revalidatePath("/receitas");
  redirect("/receitas");
}

export async function atualizarReceitaAction(
  id: string,
  _prevState: ReceitaFormState,
  formData: FormData
): Promise<ReceitaFormState> {
  const parsed = receitaSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { itens, ...dados } = parsed.data;

  await db.update(receitas).set({ ...dados, updatedAt: new Date() }).where(eq(receitas.id, id));
  await salvarItens(id, itens);

  revalidatePath("/receitas");
  revalidatePath(`/receitas/${id}`);
  redirect("/receitas");
}

export async function excluirReceitaAction(id: string) {
  try {
    await db.delete(receitas).where(eq(receitas.id, id));
  } catch {
    return;
  }
  revalidatePath("/receitas");
}
