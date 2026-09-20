"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assinaturas, enderecos, kits } from "@/db/schema";
import { obterSessaoCliente } from "@/lib/auth";
import { alinharAoFuturo, podeEditarProximoCiclo, proximaData, type Frequencia } from "@/lib/assinaturas";

const assinarSchema = z.object({
  kitId: z.string().uuid(),
  enderecoId: z.string().uuid(),
  frequencia: z.enum(["semanal", "quinzenal", "mensal"]),
  observacoes: z.string().trim().nullable(),
  composicao: z.string().transform((s, ctx) => {
    try {
      return z.array(z.string().uuid()).min(1).parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Monte o kit antes de assinar." });
      return z.NEVER;
    }
  }),
});

export interface AssinaturaState {
  erro?: string;
}

export async function criarAssinaturaAction(
  _prev: AssinaturaState,
  formData: FormData
): Promise<AssinaturaState> {
  const sessao = await obterSessaoCliente();
  if (!sessao) return { erro: "Entre na sua conta para assinar." };

  const observacoesBrutas = String(formData.get("observacoes") ?? "").trim();
  const parsed = assinarSchema.safeParse({
    kitId: formData.get("kitId"),
    enderecoId: formData.get("enderecoId"),
    frequencia: formData.get("frequencia"),
    observacoes: observacoesBrutas || null,
    composicao: formData.get("composicao") ?? "[]",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const dados = parsed.data;

  const [kit] = await db
    .select()
    .from(kits)
    .where(and(eq(kits.id, dados.kitId), eq(kits.publicado, true), eq(kits.ativo, true)))
    .limit(1);
  if (!kit) return { erro: "Esse kit saiu do ar." };
  if (dados.composicao.length !== kit.quantidadePratos) {
    return { erro: `O kit ${kit.nome} precisa de ${kit.quantidadePratos} pratos.` };
  }

  // O endereço precisa ser do próprio cliente: sem este filtro, um id
  // adivinhado mandaria a entrega para a casa de outra pessoa.
  const [endereco] = await db
    .select()
    .from(enderecos)
    .where(and(eq(enderecos.id, dados.enderecoId), eq(enderecos.clienteId, sessao.clienteId)))
    .limit(1);
  if (!endereco) return { erro: "Escolha um endereço da sua conta." };

  // Primeira entrega em um ciclo a partir de hoje: dá tempo de produzir e deixa
  // o dia da semana igual ao da assinatura desde o começo.
  const primeira = proximaData(new Date(), dados.frequencia as Frequencia);

  const [criada] = await db
    .insert(assinaturas)
    .values({
      clienteId: sessao.clienteId,
      kitId: kit.id,
      enderecoId: endereco.id,
      frequencia: dados.frequencia,
      proximaEntrega: primeira,
      composicaoPadrao: dados.composicao,
      observacoes: dados.observacoes,
    })
    .returning({ id: assinaturas.id });

  revalidatePath("/minha-conta");
  redirect(`/assinatura/${criada.id}`);
}

/** Carrega a assinatura garantindo que ela é do cliente da sessão. */
async function minhaAssinatura(id: string) {
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");
  const [linha] = await db
    .select()
    .from(assinaturas)
    .where(and(eq(assinaturas.id, id), eq(assinaturas.clienteId, sessao.clienteId)))
    .limit(1);
  return linha ?? null;
}

export async function pausarAssinaturaAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const assinatura = await minhaAssinatura(id);
  if (!assinatura || assinatura.status === "cancelada") return;

  const pausando = assinatura.status === "ativa";
  await db
    .update(assinaturas)
    .set({
      status: pausando ? "pausada" : "ativa",
      pausadaEm: pausando ? new Date() : null,
      // Ao retomar, a data pode estar no passado — realinha em vez de gerar de
      // uma vez todas as entregas do período pausado.
      proximaEntrega: pausando
        ? assinatura.proximaEntrega
        : alinharAoFuturo(assinatura.proximaEntrega, assinatura.frequencia),
      updatedAt: new Date(),
    })
    .where(eq(assinaturas.id, id));

  revalidatePath(`/assinatura/${id}`);
  revalidatePath("/minha-conta");
}

export async function cancelarAssinaturaAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const assinatura = await minhaAssinatura(id);
  if (!assinatura) return;

  await db
    .update(assinaturas)
    .set({ status: "cancelada", canceladaEm: new Date(), updatedAt: new Date() })
    .where(eq(assinaturas.id, id));

  revalidatePath("/minha-conta");
  redirect("/minha-conta");
}

export interface ComposicaoState {
  erro?: string;
  ok?: boolean;
}

export async function salvarComposicaoProximaAction(
  id: string,
  _prev: ComposicaoState,
  formData: FormData
): Promise<ComposicaoState> {
  const assinatura = await minhaAssinatura(id);
  if (!assinatura) return { erro: "Assinatura não encontrada." };
  if (!podeEditarProximoCiclo(assinatura.proximaEntrega)) {
    return { erro: "Essa entrega já entrou em produção. A troca vale a partir da próxima." };
  }

  let composicao: string[];
  try {
    composicao = z.array(z.string().uuid()).min(1).parse(JSON.parse(String(formData.get("composicao") ?? "[]")));
  } catch {
    return { erro: "Monte o kit antes de salvar." };
  }

  const [kit] = await db.select().from(kits).where(eq(kits.id, assinatura.kitId)).limit(1);
  if (!kit) return { erro: "O kit desta assinatura saiu do ar." };
  if (composicao.length !== kit.quantidadePratos) {
    return { erro: `Escolha ${kit.quantidadePratos} pratos.` };
  }

  const manterComoPadrao = formData.get("manterPadrao") === "on";
  await db
    .update(assinaturas)
    .set({
      composicaoProxima: composicao,
      composicaoPadrao: manterComoPadrao ? composicao : assinatura.composicaoPadrao,
      updatedAt: new Date(),
    })
    .where(eq(assinaturas.id, id));

  revalidatePath(`/assinatura/${id}`);
  return { ok: true };
}
