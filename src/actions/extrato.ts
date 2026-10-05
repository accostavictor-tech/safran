"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { obterSessao } from "@/lib/auth";
import { sincronizarConexao, sincronizarTodas, type ResultadoSync } from "@/lib/pluggy/sync";

export interface ConectarBancoState {
  erro?: string;
  ok?: string;
}

const itemIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "O ID do item tem o formato de um UUID.");

function explicarFalha(r: Extract<ResultadoSync, { ok: false }>): string {
  if (r.status === 404) {
    return "Item não encontrado na Pluggy. Confira o ID no Meu Pluggy e se as credenciais configuradas são da mesma conta.";
  }
  if (r.status === 401 || r.status === 403) {
    return "A Pluggy recusou as credenciais. Confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.";
  }
  return r.erro;
}

/** Conecta um banco já autorizado no Meu Pluggy e puxa o extrato na hora. */
export async function conectarBancoAction(
  _prev: ConectarBancoState,
  formData: FormData
): Promise<ConectarBancoState> {
  if (!(await obterSessao())) return { erro: "Sessão expirada." };

  const parsed = itemIdSchema.safeParse(formData.get("itemId") ?? "");
  if (!parsed.success) return { erro: parsed.error.issues[0]?.message ?? "ID inválido." };

  const r = await sincronizarConexao(parsed.data.toLowerCase());
  revalidatePath("/admin/extrato");
  if (!r.ok) return { erro: explicarFalha(r) };

  return {
    ok: `${r.instituicao ?? "Banco"} conectado: ${r.contas} conta(s), ${r.movimentacoes} movimentação(ões).`,
  };
}

export interface ResumoSync {
  instituicao: string | null;
  ok: boolean;
  movimentacoes: number;
  erro?: string;
}

export async function sincronizarExtratoAction(): Promise<ResumoSync[] | { erro: string }> {
  if (!(await obterSessao())) return { erro: "Sessão expirada." };

  const resultados = await sincronizarTodas();
  revalidatePath("/admin/extrato");
  return resultados.map(({ instituicao, resultado: r }) =>
    r.ok
      ? { instituicao: r.instituicao ?? instituicao, ok: true, movimentacoes: r.movimentacoes }
      : { instituicao, ok: false, movimentacoes: 0, erro: explicarFalha(r) }
  );
}
