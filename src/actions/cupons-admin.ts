"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { cupons } from "@/db/schema";
import { reaisParaCentavos } from "@/lib/calculations";
import { normalizarCodigoCupom } from "@/lib/cupom";
import { eViolacaoDeUnicidade } from "@/lib/db-erros";

const valorOuNulo = z
  .union([z.null(), z.string(), z.number()])
  .transform((v) => (v === null || v === "" ? null : Number(String(v).replace(",", "."))));

const cupomSchema = z
  .object({
    codigo: z.string().trim().min(3, "O código precisa de ao menos 3 caracteres.").max(40),
    tipo: z.enum(["percentual", "fixo", "frete_gratis"]),
    valorPercentual: valorOuNulo,
    valorReais: valorOuNulo,
    minimoReais: valorOuNulo,
    validadeFim: z.union([z.null(), z.string()]),
    limiteTotal: valorOuNulo,
    limitePorCliente: z.coerce.number().int().min(1).max(99),
    primeiraCompraApenas: z.coerce.boolean().default(false),
    ativo: z.coerce.boolean().default(true),
  })
  .refine((d) => d.tipo !== "percentual" || (d.valorPercentual !== null && d.valorPercentual > 0 && d.valorPercentual <= 100), {
    message: "Informe o percentual de desconto, entre 1 e 100.",
    path: ["valorPercentual"],
  })
  .refine((d) => d.tipo !== "fixo" || (d.valorReais !== null && d.valorReais > 0), {
    message: "Informe o valor do desconto em reais.",
    path: ["valorReais"],
  });

export interface CupomFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const texto = (campo: string) => {
    const v = formData.get(campo);
    return v === null || String(v).trim() === "" ? null : String(v);
  };
  return {
    codigo: formData.get("codigo") ?? "",
    tipo: formData.get("tipo") ?? "percentual",
    valorPercentual: texto("valorPercentual"),
    valorReais: texto("valorReais"),
    minimoReais: texto("minimoReais"),
    validadeFim: texto("validadeFim"),
    limiteTotal: texto("limiteTotal"),
    limitePorCliente: formData.get("limitePorCliente") || "1",
    primeiraCompraApenas: formData.get("primeiraCompraApenas") === "on",
    ativo: formData.get("ativo") === "on",
  };
}

function paraColunas(dados: z.infer<typeof cupomSchema>) {
  return {
    codigo: normalizarCodigoCupom(dados.codigo),
    tipo: dados.tipo,
    valorPercentual: dados.tipo === "percentual" ? dados.valorPercentual : null,
    valorCentavos: dados.tipo === "fixo" && dados.valorReais !== null ? reaisParaCentavos(dados.valorReais) : null,
    minimoCentavos: dados.minimoReais !== null ? reaisParaCentavos(dados.minimoReais) : 0,
    // Vence no fim do dia escolhido, não à meia-noite do começo dele.
    validadeFim: dados.validadeFim ? new Date(`${dados.validadeFim}T23:59:59`) : null,
    limiteTotal: dados.limiteTotal !== null ? Math.trunc(dados.limiteTotal) : null,
    limitePorCliente: dados.limitePorCliente,
    primeiraCompraApenas: dados.primeiraCompraApenas,
    ativo: dados.ativo,
  };
}

export async function criarCupomAction(
  _prevState: CupomFormState,
  formData: FormData
): Promise<CupomFormState> {
  const parsed = cupomSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const valores = paraColunas(parsed.data);
  try {
    await db.insert(cupons).values(valores);
  } catch (err) {
    if (eViolacaoDeUnicidade(err)) return { erro: `O cupom "${valores.codigo}" já existe.` };
    throw err;
  }

  revalidatePath("/admin/cupons");
  redirect("/admin/cupons?toast=criado");
}

export async function atualizarCupomAction(
  id: string,
  _prevState: CupomFormState,
  formData: FormData
): Promise<CupomFormState> {
  const parsed = cupomSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const valores = paraColunas(parsed.data);
  try {
    await db.update(cupons).set(valores).where(eq(cupons.id, id));
  } catch (err) {
    if (eViolacaoDeUnicidade(err)) return { erro: `O cupom "${valores.codigo}" já existe.` };
    throw err;
  }

  revalidatePath("/admin/cupons");
  redirect("/admin/cupons?toast=atualizado");
}

/**
 * Desativa em vez de apagar: o código fica gravado nos pedidos que o usaram, e
 * excluir apagaria a explicação de um desconto já concedido.
 */
export async function desativarCupomAction(id: string) {
  await db.update(cupons).set({ ativo: false }).where(eq(cupons.id, id));
  revalidatePath("/admin/cupons");
}
