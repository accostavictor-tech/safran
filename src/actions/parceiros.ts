"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { parceiros } from "@/db/schema";
import { buscarParceiroPorCodigo, paraRegra } from "@/db/queries/parceiros";
import { aplicarParceiro, normalizarCodigoParceiro, type TipoParceiro } from "@/lib/parceiros";
import { eViolacaoDeUnicidade } from "@/lib/db-erros";

export interface PreviaParceiro {
  ok: boolean;
  mensagem: string;
  codigo?: string;
  nome?: string;
  tipo?: TipoParceiro;
  descontoCentavos?: number;
}

/**
 * Prévia do código de parceiro no checkout.
 *
 * Mostra só o desconto: a comissão é assunto entre a Safran e o parceiro, e
 * não tem por que aparecer para o cliente.
 */
export async function conferirParceiroAction(
  codigoBruto: string,
  subtotalCentavos: number
): Promise<PreviaParceiro> {
  const parceiro = await buscarParceiroPorCodigo(codigoBruto);
  if (!parceiro) return { ok: false, mensagem: "Código não encontrado ou inativo." };

  const efeito = aplicarParceiro(paraRegra(parceiro), Math.max(0, subtotalCentavos));
  return {
    ok: true,
    mensagem:
      efeito.descontoCentavos > 0
        ? `Desconto de ${parceiro.descontoPct}% aplicado.`
        : `Pedido vinculado a ${parceiro.nome}.`,
    codigo: parceiro.codigoIndicacao,
    nome: parceiro.nome,
    tipo: parceiro.tipo,
    descontoCentavos: efeito.descontoCentavos,
  };
}

// --- Admin ---

const parceiroSchema = z
  .object({
    tipo: z.enum(["empresa", "afiliado", "nutricionista"]),
    nome: z.string().trim().min(2, "Informe o nome do parceiro."),
    contatoNome: z.string().trim().nullable(),
    telefone: z.string().trim().nullable(),
    email: z.string().trim().nullable(),
    documento: z.string().trim().nullable(),
    codigoIndicacao: z.string().trim().min(3, "O código precisa de ao menos 3 caracteres."),
    descontoPct: z.coerce.number().min(0).max(100),
    comissaoPct: z.coerce.number().min(0).max(100),
    observacoes: z.string().trim().nullable(),
    ativo: z.coerce.boolean().default(true),
  })
  .refine((d) => d.descontoPct + d.comissaoPct <= 100, {
    message: "Desconto mais comissão não podem passar de 100% do pedido.",
    path: ["comissaoPct"],
  });

export interface ParceiroFormState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const texto = (campo: string) => {
    const v = formData.get(campo);
    return v === null || String(v).trim() === "" ? null : String(v);
  };
  return {
    tipo: formData.get("tipo") ?? "afiliado",
    nome: formData.get("nome") ?? "",
    contatoNome: texto("contatoNome"),
    telefone: texto("telefone"),
    email: texto("email"),
    documento: formData.get("documento") ? String(formData.get("documento")).replace(/\D/g, "") || null : null,
    codigoIndicacao: formData.get("codigoIndicacao") ?? "",
    descontoPct: String(formData.get("descontoPct") ?? "0").replace(",", "."),
    comissaoPct: String(formData.get("comissaoPct") ?? "0").replace(",", "."),
    observacoes: texto("observacoes"),
    ativo: formData.get("ativo") === "on",
  };
}

export async function salvarParceiroAction(
  id: string | null,
  _prev: ParceiroFormState,
  formData: FormData
): Promise<ParceiroFormState> {
  const parsed = parceiroSchema.safeParse(parseFormData(formData));
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  const dados = parsed.data;
  const codigoIndicacao = normalizarCodigoParceiro(dados.codigoIndicacao);
  if (codigoIndicacao.length < 3) return { erro: "O código só aceita letras, números e hífen." };

  const linha = { ...dados, codigoIndicacao };

  try {
    if (id) {
      await db.update(parceiros).set({ ...linha, updatedAt: new Date() }).where(eq(parceiros.id, id));
    } else {
      await db.insert(parceiros).values(linha);
    }
  } catch (err) {
    // O Drizzle embrulha o erro do driver, então o código vem em err.cause.
    if (eViolacaoDeUnicidade(err)) return { erro: "Já existe um parceiro com esse código." };
    throw err;
  }

  revalidatePath("/admin/parceiros");
  redirect(`/admin/parceiros?ok=${id ? "atualizado" : "criado"}`);
}

export async function excluirParceiroAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  // Pedidos antigos guardam o código em snapshot, então o histórico sobrevive à
  // exclusão; o vínculo vira nulo e o relatório deixa de contar o parceiro.
  await db.delete(parceiros).where(eq(parceiros.id, id));
  revalidatePath("/admin/parceiros");
}
