"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, isNull, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { clientes, codigosAcesso, enderecos, zonasEntrega } from "@/db/schema";
import { criarSessaoCliente, encerrarSessaoCliente, obterSessaoCliente } from "@/lib/auth";
import { chaveEndereco, resolverZonaPorBairro } from "@/lib/enderecos";
import { normalizarTelefone } from "@/lib/loja";
import { enviarWhatsapp } from "@/lib/notificacoes";

const VALIDADE_MINUTOS = 10;
const MAX_TENTATIVAS = 5;
/** Máximo de códigos por telefone na janela, para o endpoint não virar torneira de mensagem. */
const MAX_ENVIOS = 3;
const JANELA_ENVIOS_MINUTOS = 15;

export interface EntrarState {
  erro?: string;
  /** Telefone já normalizado, devolvido para a etapa do código. */
  telefone?: string;
  aviso?: string;
}

function minutosAtras(minutos: number): Date {
  return new Date(Date.now() - minutos * 60_000);
}

export async function solicitarCodigoAction(
  _prev: EntrarState,
  formData: FormData
): Promise<EntrarState> {
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  if (!telefone) return { erro: "Informe um WhatsApp com DDD." };

  const [{ enviados } = { enviados: 0 }] = await db
    .select({ enviados: sql<number>`count(*)::int` })
    .from(codigosAcesso)
    .where(and(eq(codigosAcesso.telefone, telefone), gte(codigosAcesso.createdAt, minutosAtras(JANELA_ENVIOS_MINUTOS))));

  if (Number(enviados) >= MAX_ENVIOS) {
    return { erro: "Muitos códigos pedidos. Espere alguns minutos e tente de novo." };
  }

  // randomInt do crypto, não Math.random: código previsível é código adivinhável.
  const codigo = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codigoHash = await bcrypt.hash(codigo, 10);

  await db.insert(codigosAcesso).values({
    telefone,
    codigoHash,
    expiraEm: new Date(Date.now() + VALIDADE_MINUTOS * 60_000),
  });

  const envio = await enviarWhatsapp(
    telefone,
    `Safran Congelados: seu código de acesso é ${codigo}. Vale por ${VALIDADE_MINUTOS} minutos.`
  );

  return {
    telefone,
    aviso: envio.somenteLog
      ? "O envio por WhatsApp ainda não está configurado. O código foi registrado no log do servidor."
      : undefined,
  };
}

export async function confirmarCodigoAction(
  _prev: EntrarState,
  formData: FormData
): Promise<EntrarState> {
  const telefone = normalizarTelefone(String(formData.get("telefone") ?? ""));
  const codigo = String(formData.get("codigo") ?? "").replace(/\D/g, "");
  if (!telefone) return { erro: "Telefone inválido." };
  if (codigo.length !== 6) return { erro: "O código tem 6 dígitos.", telefone };

  // Só o código mais recente ainda válido e não usado vale.
  const [registro] = await db
    .select()
    .from(codigosAcesso)
    .where(
      and(
        eq(codigosAcesso.telefone, telefone),
        isNull(codigosAcesso.usadoEm),
        gte(codigosAcesso.expiraEm, new Date())
      )
    )
    .orderBy(desc(codigosAcesso.createdAt))
    .limit(1);

  if (!registro) return { erro: "Código expirado. Peça um novo.", telefone };
  if (registro.tentativas >= MAX_TENTATIVAS) {
    return { erro: "Código bloqueado por tentativas erradas. Peça um novo.", telefone };
  }

  if (!(await bcrypt.compare(codigo, registro.codigoHash))) {
    await db
      .update(codigosAcesso)
      .set({ tentativas: registro.tentativas + 1 })
      .where(eq(codigosAcesso.id, registro.id));
    return { erro: "Código incorreto.", telefone };
  }

  // Marca como usado na mesma condição de "ainda não usado": se dois pedidos
  // chegarem juntos com o código certo, só um consome.
  const consumidos = await db
    .update(codigosAcesso)
    .set({ usadoEm: new Date() })
    .where(and(eq(codigosAcesso.id, registro.id), isNull(codigosAcesso.usadoEm)))
    .returning({ id: codigosAcesso.id });
  if (consumidos.length === 0) return { erro: "Código já utilizado. Peça um novo.", telefone };

  const [cliente] = await db
    .insert(clientes)
    .values({ telefone, nome: "" })
    .onConflictDoUpdate({ target: clientes.telefone, set: { updatedAt: new Date() } })
    .returning({ id: clientes.id, nome: clientes.nome });

  await criarSessaoCliente({ clienteId: cliente.id, telefone, nome: cliente.nome });
  redirect("/minha-conta");
}

export async function sairDaContaAction() {
  await encerrarSessaoCliente();
  redirect("/");
}

// --- Perfil e agenda de endereços ---

export interface PerfilState {
  erro?: string;
  ok?: boolean;
}

export async function salvarPerfilAction(_prev: PerfilState, formData: FormData): Promise<PerfilState> {
  const sessao = await obterSessaoCliente();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const nome = String(formData.get("nome") ?? "").trim();
  const emailBruto = String(formData.get("email") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe seu nome." };
  // Validação de e-mail aqui é só para pegar erro de digitação; quem confirma
  // que o endereço existe é o envio, não uma expressão regular.
  if (emailBruto && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailBruto)) {
    return { erro: "E-mail inválido." };
  }

  await db
    .update(clientes)
    .set({ nome, email: emailBruto || null, updatedAt: new Date() })
    .where(eq(clientes.id, sessao.clienteId));

  // O nome vive também no cookie de sessão, para o cabeçalho não precisar de
  // uma consulta por página; sem isto ele ficaria exibindo o nome antigo.
  await criarSessaoCliente({ clienteId: sessao.clienteId, telefone: sessao.telefone, nome });

  revalidatePath("/minha-conta");
  return { ok: true };
}

export interface EnderecoState {
  erro?: string;
  ok?: boolean;
}

export async function salvarEnderecoAction(
  _prev: EnderecoState,
  formData: FormData
): Promise<EnderecoState> {
  const sessao = await obterSessaoCliente();
  if (!sessao) return { erro: "Sessão expirada. Entre de novo." };

  const dados = {
    logradouro: String(formData.get("logradouro") ?? "").trim(),
    numero: String(formData.get("numero") ?? "").trim(),
    complemento: String(formData.get("complemento") ?? "").trim() || null,
    bairro: String(formData.get("bairro") ?? "").trim(),
    referencia: String(formData.get("referencia") ?? "").trim() || null,
    cep: String(formData.get("cep") ?? "").replace(/\D/g, "") || null,
  };
  if (!dados.logradouro || !dados.numero || !dados.bairro) {
    return { erro: "Preencha rua, número e bairro." };
  }

  const zonas = await db.select().from(zonasEntrega).where(eq(zonasEntrega.ativa, true));
  const zona = resolverZonaPorBairro(zonas, dados.bairro);
  if (!zona) return { erro: "Ainda não entregamos nesse bairro. Fale com a gente no WhatsApp." };

  const jaSalvos = await db.select().from(enderecos).where(eq(enderecos.clienteId, sessao.clienteId));
  const chaveNova = chaveEndereco(dados);
  const existente = jaSalvos.find((e) => chaveEndereco(e) === chaveNova);
  if (existente) {
    await db
      .update(enderecos)
      .set({ referencia: dados.referencia, cep: dados.cep, zonaId: zona.id })
      .where(eq(enderecos.id, existente.id));
  } else {
    await db.insert(enderecos).values({
      clienteId: sessao.clienteId,
      ...dados,
      zonaId: zona.id,
      // O primeiro endereço da conta já entra como padrão: obrigar um segundo
      // clique para marcar o único endereço que existe não faz sentido.
      padrao: jaSalvos.length === 0,
    });
  }

  revalidatePath("/minha-conta");
  return { ok: true };
}

export async function definirEnderecoPadraoAction(formData: FormData) {
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");
  const id = String(formData.get("id") ?? "");

  // Um padrão por cliente: limpa todos e marca o escolhido, na mesma transação.
  await db.transaction(async (tx) => {
    await tx.update(enderecos).set({ padrao: false }).where(eq(enderecos.clienteId, sessao.clienteId));
    await tx
      .update(enderecos)
      .set({ padrao: true })
      .where(and(eq(enderecos.id, id), eq(enderecos.clienteId, sessao.clienteId)));
  });

  revalidatePath("/minha-conta");
}

export async function excluirEnderecoAction(formData: FormData) {
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");
  const id = String(formData.get("id") ?? "");

  // O filtro por clienteId não é redundante: sem ele, um id adivinhado apagaria
  // o endereço de outra pessoa.
  await db.delete(enderecos).where(and(eq(enderecos.id, id), eq(enderecos.clienteId, sessao.clienteId)));

  revalidatePath("/minha-conta");
}
