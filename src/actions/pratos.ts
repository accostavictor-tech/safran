"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pratos, pratoReceitas } from "@/db/schema";
import { reaisParaCentavos } from "@/lib/calculations";
import { gerarSlug } from "@/lib/slug";

const itemSchema = z.object({
  receitaId: z.string().uuid(),
  quantidadeG: z.coerce.number().min(0.01, "Quantidade deve ser maior que zero."),
});

/**
 * Preço em reais digitado por uma pessoa -> centavos inteiros.
 * Aceita vírgula decimal e campo vazio (= prato ainda sem preço de venda).
 * Não usa z.coerce.number() porque Number(null) é 0, o que transformaria
 * "sem preço" em "de graça".
 */
const precoParaCentavos = z
  .union([z.null(), z.string(), z.number()])
  .transform((v) => (v === null || v === "" ? null : reaisParaCentavos(Number(String(v).replace(",", ".")))))
  .refine((v) => v === null || (Number.isFinite(v) && v > 0), "Preço de venda inválido.");

const pratoSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe o nome."),
    slug: z.string().trim().nullable(),
    descricao: z.string().trim().nullable(),
    categoria: z.string().trim().nullable(),
    precoVendaCentavos: precoParaCentavos,
    publicado: z.coerce.boolean().default(false),
    disponibilidade: z.enum(["sempre", "estoque", "indisponivel"]).default("sempre"),
    estoqueUnidades: z.coerce.number().int().min(0).default(0),
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
  })
  .refine((d) => !d.publicado || d.precoVendaCentavos !== null, {
    message: "Defina o preço de venda antes de publicar o prato na loja.",
    path: ["precoVendaCentavos"],
  });

export interface PratoFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const textoOuNulo = (campo: string) => {
    const v = formData.get(campo);
    return v === null || v === "" ? null : String(v);
  };

  return {
    nome: formData.get("nome"),
    slug: textoOuNulo("slug"),
    descricao: textoOuNulo("descricao"),
    categoria: textoOuNulo("categoria"),
    precoVendaCentavos: textoOuNulo("precoVenda"),
    publicado: formData.get("publicado") === "on",
    disponibilidade: formData.get("disponibilidade") ?? "sempre",
    estoqueUnidades: formData.get("estoqueUnidades") || "0",
    custoEmbalagem: formData.get("custoEmbalagem"),
    margemLucro: formData.get("margemLucro"),
    taxaCartao: formData.get("taxaCartao") || "0",
    imposto: formData.get("imposto") || "0",
    comissao: formData.get("comissao") || "0",
    ativo: formData.get("ativo") === "on",
    itens: formData.get("itens") ?? "[]",
  };
}

/** Postgres: violação de unicidade. Aqui só o slug do prato pode colidir. */
function eSlugDuplicado(err: unknown): boolean {
  return (err as { code?: string })?.code === "23505";
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
  const valores = { ...dados, slug: dados.slug || gerarSlug(dados.nome) };

  let novoId: string;
  try {
    const [novo] = await db.insert(pratos).values(valores).returning({ id: pratos.id });
    novoId = novo.id;
  } catch (err) {
    if (eSlugDuplicado(err)) {
      return { erro: `Já existe um prato com o endereço "${valores.slug}". Escolha outro.` };
    }
    throw err;
  }
  await salvarItens(novoId, itens);

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
  const valores = { ...dados, slug: dados.slug || gerarSlug(dados.nome) };

  try {
    await db.update(pratos).set({ ...valores, updatedAt: new Date() }).where(eq(pratos.id, id));
  } catch (err) {
    if (eSlugDuplicado(err)) {
      return { erro: `Já existe um prato com o endereço "${valores.slug}". Escolha outro.` };
    }
    throw err;
  }
  await salvarItens(id, itens);

  revalidatePath("/pratos");
  revalidatePath(`/pratos/${id}`);
  redirect("/pratos?toast=atualizado");
}

export async function excluirPratoAction(id: string) {
  await db.delete(pratos).where(eq(pratos.id, id));
  revalidatePath("/pratos");
}
