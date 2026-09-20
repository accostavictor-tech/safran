"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { TAG_VITRINE } from "@/db/queries/loja";
import { reaisParaCentavos } from "@/lib/calculations";
import { gerarSlug } from "@/lib/slug";
import { eViolacaoDeUnicidade } from "@/lib/db-erros";

const kitSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do kit."),
  slug: z.string().trim(),
  descricao: z.string().trim().nullable(),
  quantidadePratos: z.coerce.number().int().min(2, "Um kit tem ao menos 2 pratos.").max(30),
  precoReais: z.coerce.number().positive("Informe o preço do kit."),
  ordem: z.coerce.number().int().min(0).max(999),
  publicado: z.coerce.boolean().default(false),
  ativo: z.coerce.boolean().default(true),
});

export interface KitFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const texto = (campo: string) => {
    const v = formData.get(campo);
    return v === null || String(v).trim() === "" ? null : String(v);
  };
  return {
    nome: formData.get("nome") ?? "",
    slug: formData.get("slug") ?? "",
    descricao: texto("descricao"),
    quantidadePratos: formData.get("quantidadePratos") ?? 0,
    precoReais: String(formData.get("precoReais") ?? "0").replace(",", "."),
    ordem: formData.get("ordem") ?? 0,
    publicado: formData.get("publicado") === "on",
    ativo: formData.get("ativo") === "on",
  };
}

function paraLinha(dados: z.infer<typeof kitSchema>) {
  return {
    nome: dados.nome,
    slug: dados.slug ? gerarSlug(dados.slug) : gerarSlug(dados.nome),
    descricao: dados.descricao,
    quantidadePratos: dados.quantidadePratos,
    precoCentavos: reaisParaCentavos(dados.precoReais),
    ordem: dados.ordem,
    publicado: dados.publicado,
    ativo: dados.ativo,
  };
}

export async function salvarKitAction(
  id: string | null,
  _prev: KitFormState,
  formData: FormData
): Promise<KitFormState> {
  const parsed = kitSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const linha = paraLinha(parsed.data);
  if (!linha.slug) return { erro: "Não consegui gerar um endereço a partir desse nome." };

  try {
    if (id) {
      await db.update(kits).set({ ...linha, updatedAt: new Date() }).where(eq(kits.id, id));
    } else {
      await db.insert(kits).values(linha);
    }
  } catch (err) {
    // O Drizzle embrulha o erro do driver, então o código vem em err.cause.
    if (eViolacaoDeUnicidade(err)) return { erro: "Já existe um kit com esse endereço (slug)." };
    throw err;
  }

  updateTag(TAG_VITRINE);
  revalidatePath("/admin/kits");
  redirect(`/admin/kits?ok=${id ? "atualizado" : "criado"}`);
}

export async function excluirKitAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await db.delete(kits).where(eq(kits.id, id));
  updateTag(TAG_VITRINE);
  revalidatePath("/admin/kits");
}
