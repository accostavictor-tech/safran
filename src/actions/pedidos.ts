"use server";

import { redirect } from "next/navigation";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  clientes,
  enderecos,
  pedidoEventos,
  pedidoItens,
  pedidos,
  pratos,
  zonasEntrega,
} from "@/db/schema";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import { reaisParaCentavos } from "@/lib/calculations";
import {
  calcularSubtotal,
  calcularTotal,
  normalizarBairro,
  normalizarTelefone,
  PEDIDO_MINIMO_CENTAVOS,
  resolverFrete,
} from "@/lib/loja";

const itemSchema = z.object({
  pratoId: z.string().uuid(),
  quantidade: z.coerce.number().int().min(1).max(50),
});

const checkoutSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome completo."),
  telefone: z.string().trim().min(10, "Informe um telefone com DDD."),
  bairro: z.string().trim().min(1, "Selecione o bairro de entrega."),
  logradouro: z.string().trim().min(2, "Informe a rua."),
  numero: z.string().trim().min(1, "Informe o número."),
  complemento: z.string().trim().nullable(),
  referencia: z.string().trim().nullable(),
  observacoes: z.string().trim().nullable(),
  itens: z.string().transform((s, ctx) => {
    try {
      return z.array(itemSchema).min(1, "Seu carrinho está vazio.").parse(JSON.parse(s));
    } catch {
      ctx.addIssue({ code: "custom", message: "Carrinho inválido." });
      return z.NEVER;
    }
  }),
});

export interface CheckoutState {
  erro?: string;
}

function parseFormData(formData: FormData) {
  const texto = (campo: string) => {
    const v = formData.get(campo);
    return v === null || String(v).trim() === "" ? null : String(v);
  };
  return {
    nome: formData.get("nome") ?? "",
    telefone: formData.get("telefone") ?? "",
    bairro: formData.get("bairro") ?? "",
    logradouro: formData.get("logradouro") ?? "",
    numero: formData.get("numero") ?? "",
    complemento: texto("complemento"),
    referencia: texto("referencia"),
    observacoes: texto("observacoes"),
    itens: formData.get("itens") ?? "[]",
  };
}

export async function criarPedidoAction(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const parsed = checkoutSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parsed.data;

  const telefone = normalizarTelefone(dados.telefone);
  if (!telefone) return { erro: "Telefone inválido. Use DDD + número." };

  // O cliente manda prato e quantidade. Preço, frete e total saem daqui.
  const ids = [...new Set(dados.itens.map((i) => i.pratoId))];
  const disponiveis = await db
    .select({
      id: pratos.id,
      codigo: pratos.codigo,
      nome: pratos.nome,
      precoVendaCentavos: pratos.precoVendaCentavos,
      publicado: pratos.publicado,
      disponibilidade: pratos.disponibilidade,
      estoqueUnidades: pratos.estoqueUnidades,
    })
    .from(pratos)
    .where(inArray(pratos.id, ids));

  const porId = new Map(disponiveis.map((p) => [p.id, p]));
  for (const item of dados.itens) {
    const prato = porId.get(item.pratoId);
    if (!prato || !prato.publicado || prato.precoVendaCentavos === null || prato.disponibilidade === "indisponivel") {
      return { erro: `"${prato?.nome ?? "Um item"}" saiu do cardápio. Revise o carrinho.` };
    }
    if (prato.disponibilidade === "estoque" && prato.estoqueUnidades < item.quantidade) {
      return { erro: `"${prato.nome}" tem só ${prato.estoqueUnidades} em estoque.` };
    }
  }

  const linhas = dados.itens.map((item) => {
    const prato = porId.get(item.pratoId)!;
    return { prato, quantidade: item.quantidade, precoUnitarioCentavos: prato.precoVendaCentavos! };
  });

  const subtotalCentavos = calcularSubtotal(linhas);
  if (subtotalCentavos < PEDIDO_MINIMO_CENTAVOS) {
    return { erro: "Pedido abaixo do mínimo para entrega." };
  }

  // Zona pelo bairro, comparando sem acento e sem caixa.
  const zonas = await db.select().from(zonasEntrega).where(eq(zonasEntrega.ativa, true));
  const bairroAlvo = normalizarBairro(dados.bairro);
  const zona = zonas.find((z) => z.bairros.some((b) => normalizarBairro(b) === bairroAlvo));
  if (!zona) {
    return { erro: "Ainda não entregamos nesse bairro. Fale com a gente no WhatsApp." };
  }

  const freteCentavos = resolverFrete(zona, subtotalCentavos);
  const totalCentavos = calcularTotal(subtotalCentavos, freteCentavos);

  // Custo no momento da venda, para margem histórica que não depende do custo atual.
  const precificacoes = await listarPratosComPrecificacao();
  const custoPorPrato = new Map(
    precificacoes.map((p) => [p.prato.id, reaisParaCentavos(p.precificacao.custoTotal)])
  );

  const enderecoSnapshot = {
    logradouro: dados.logradouro,
    numero: dados.numero,
    complemento: dados.complemento,
    bairro: dados.bairro,
    referencia: dados.referencia,
    zona: zona.nome,
  };

  let pedidoId: string;
  try {
    pedidoId = await db.transaction(async (tx) => {
      const [cliente] = await tx
        .insert(clientes)
        .values({ telefone, nome: dados.nome })
        .onConflictDoUpdate({ target: clientes.telefone, set: { nome: dados.nome, updatedAt: new Date() } })
        .returning({ id: clientes.id });

      await tx.insert(enderecos).values({
        clienteId: cliente.id,
        logradouro: dados.logradouro,
        numero: dados.numero,
        complemento: dados.complemento,
        bairro: dados.bairro,
        referencia: dados.referencia,
        zonaId: zona.id,
      });

      const [pedido] = await tx
        .insert(pedidos)
        .values({
          clienteId: cliente.id,
          status: "aguardando_pagamento",
          nomeCliente: dados.nome,
          telefoneCliente: telefone,
          enderecoSnapshot,
          subtotalCentavos,
          freteCentavos,
          totalCentavos,
          observacoes: dados.observacoes,
        })
        .returning({ id: pedidos.id });

      await tx.insert(pedidoItens).values(
        linhas.map((l, idx) => ({
          pedidoId: pedido.id,
          pratoId: l.prato.id,
          nomeSnapshot: l.prato.nome,
          codigoSnapshot: l.prato.codigo,
          precoUnitarioCentavos: l.precoUnitarioCentavos,
          custoUnitarioSnapshotCentavos: custoPorPrato.get(l.prato.id) ?? 0,
          quantidade: l.quantidade,
          ordem: idx,
        }))
      );

      await tx.insert(pedidoEventos).values({
        pedidoId: pedido.id,
        para: "aguardando_pagamento",
        autor: "loja",
      });

      // Baixa de estoque com a checagem na própria condição: se alguém levou a
      // última unidade no meio do caminho, nenhuma linha é afetada e o pedido cai.
      for (const l of linhas) {
        if (l.prato.disponibilidade !== "estoque") continue;
        const baixados = await tx
          .update(pratos)
          .set({ estoqueUnidades: sql`${pratos.estoqueUnidades} - ${l.quantidade}` })
          .where(and(eq(pratos.id, l.prato.id), gte(pratos.estoqueUnidades, l.quantidade)))
          .returning({ id: pratos.id });
        if (baixados.length === 0) {
          throw new Error(`ESTOQUE_INSUFICIENTE:${l.prato.nome}`);
        }
      }

      return pedido.id;
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("ESTOQUE_INSUFICIENTE:")) {
      return { erro: `"${msg.split(":")[1]}" acabou de esgotar. Revise o carrinho.` };
    }
    throw err;
  }

  redirect(`/pedido/${pedidoId}`);
}
