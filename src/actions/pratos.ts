"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pratos, pratoReceitas } from "@/db/schema";

const itemSchema = z.object({
  receitaId: z.string().uuid(),
  quantidadeG: z.coerce.number().min(0.01, "Quantidade deve ser maior que zero."),
});

const pratoSchema = z.object({
  nome: z.string().trim().min(1, "Informe o nome."),
  custoEmbalagem: z.coerce.number().min(0, "Custo da embalagem não pode ser negativo."),
  margemLucro: z.coerce.number().min(0).max(99.99, "Margem deve ser menor que 100%."),
  taxaCartao: z.coerce.number().min(0).max(100),
  imposto: z.coerce.number().min(0).max(100),
  comissao: z.coerce.number().min(0).max(100),
  ativo: z.coerce.boolean().default(true),
  itens: z
    .string()
    .transform((s, ctx) => {
      try {
        const parsed = JSON.parse(s);
        return z.array(itemSchema).min(1, "Adicione ao menos uma receita.").parse(parsed);
      } catch {
        ctx.addIssue({ code: "custom", message: "Lista de receitas inválida." });
        return z.NEVER;
      }
    }),
});

export interface PratoFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  return {
    nome: formData.get("nome"),
    custoEmbalagem: formData.get("custoEmbalagem"),
    margemLucro: formData.get("margemLucro"),
    taxaCartao: formData.get("taxaCartao") || "0",
    imposto: formData.get("imposto") || "0",
    comissao: formData.get("comissao") || "0",
    ativo: formData.get("ativo") === "on",
    itens: formData.get("itens") ?? "[]",
  };
}

async function salvarItens(pratoId: string, itens: { receitaId: string; quantidadeG: number }[]) {
  await db.delete(pratoReceitas).where(eq(pratoReceitas.pratoId, pratoId));
  if (itens.length === 0) return;
  await db.insert(pratoReceitas).values(
    itens.map((item, idx) => ({
      pratoId,
      receitaId: item.receitaId,
      quantidadeG: item.quantidadeG,
      ordem: idx,
    }))
  );
}

export async function criarPratoAction(_prevState: PratoFormState, formData: FormData): Promise<PratoFormState> {
  const parsed = pratoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { itens, ...dados } = parsed.data;

  const [novo] = await db.insert(pratos).values(dados).returning({ id: pratos.id });
  await salvarItens(novo.id, itens);

  revalidatePath("/pratos");
  redirect("/pratos?toast=criado");
}

export async function atualizarPratoAction(
  id: string,
  _prevState: PratoFormState,
  formData: FormData
): Promise<PratoFormState> {
  const parsed = pratoSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { itens, ...dados } = parsed.data;

  await db.update(pratos).set({ ...dados, updatedAt: new Date() }).where(eq(pratos.id, id));
  await salvarItens(id, itens);

  revalidatePath("/pratos");
  revalidatePath(`/pratos/${id}`);
  redirect("/pratos?toast=atualizado");
}

export async function excluirPratoAction(id: string) {
  await db.delete(pratos).where(eq(pratos.id, id));
  revalidatePath("/pratos");
}
