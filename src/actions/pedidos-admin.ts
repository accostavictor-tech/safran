"use server";

import { revalidatePath, updateTag } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { creditoMovimentos, pedidoEventos, pedidoItens, pedidos, pratos } from "@/db/schema";
import { TAG_VITRINE } from "@/db/queries/loja";
import { obterSessao } from "@/lib/auth";
import { podeTransicionar } from "@/lib/pedido-status";
import { MOTIVO_COMPRA, MOTIVO_ESTORNO, MOTIVO_USO, cashbackDoPedido } from "@/lib/cashback";
import type { PedidoStatus } from "@/db/queries/pedidos";

export interface TransicaoState {
  erro?: string;
}

/**
 * Move um pedido de status, sempre pela máquina de estados e sempre gravando o
 * evento. Cancelamento devolve o estoque que a compra havia baixado.
 */
export async function mudarStatusPedidoAction(
  pedidoId: string,
  novoStatus: PedidoStatus
): Promise<TransicaoState> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Sessão expirada." };

  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, pedidoId)).limit(1);
  if (!pedido) return { erro: "Pedido não encontrado." };

  if (!podeTransicionar(pedido.status, novoStatus)) {
    return { erro: `Não é possível ir de "${pedido.status}" para "${novoStatus}".` };
  }

  await db.transaction(async (tx) => {
    // A condição de status no UPDATE evita dois sócios movendo o mesmo pedido
    // ao mesmo tempo e gravando dois eventos a partir do mesmo estado.
    const movidos = await tx
      .update(pedidos)
      .set({ status: novoStatus, updatedAt: new Date() })
      .where(and(eq(pedidos.id, pedidoId), eq(pedidos.status, pedido.status)))
      .returning({ id: pedidos.id });

    if (movidos.length === 0) throw new Error("CONCORRENCIA");

    await tx.insert(pedidoEventos).values({
      pedidoId,
      de: pedido.status,
      para: novoStatus,
      autor: sessao.nome,
    });

    // Cashback entra só na entrega: creditar antes premiaria pedido que ainda
    // pode ser cancelado. A chave única (pedido, motivo) segura o crédito duplo.
    if (novoStatus === "entregue" && pedido.clienteId) {
      const centavos = cashbackDoPedido(pedido.subtotalCentavos);
      if (centavos > 0) {
        await tx
          .insert(creditoMovimentos)
          .values({ clienteId: pedido.clienteId, pedidoId, centavos, motivo: MOTIVO_COMPRA })
          .onConflictDoNothing();
      }
    }

    if (novoStatus === "cancelado") {
      // Devolve o crédito que o pedido consumiu, como movimento de estorno — o
      // débito original fica no histórico, nada é apagado.
      const gastos = await tx
        .select({ centavos: creditoMovimentos.centavos })
        .from(creditoMovimentos)
        .where(and(eq(creditoMovimentos.pedidoId, pedidoId), eq(creditoMovimentos.motivo, MOTIVO_USO)));

      const totalGasto = gastos.reduce((acc, g) => acc + g.centavos, 0);
      if (totalGasto < 0 && pedido.clienteId) {
        await tx
          .insert(creditoMovimentos)
          .values({
            clienteId: pedido.clienteId,
            pedidoId,
            centavos: -totalGasto,
            motivo: MOTIVO_ESTORNO,
          })
          .onConflictDoNothing();
      }

      const itens = await tx
        .select({ pratoId: pedidoItens.pratoId, quantidade: pedidoItens.quantidade })
        .from(pedidoItens)
        .where(eq(pedidoItens.pedidoId, pedidoId));

      for (const item of itens) {
        if (!item.pratoId) continue;
        await tx
          .update(pratos)
          .set({ estoqueUnidades: sql`${pratos.estoqueUnidades} + ${item.quantidade}` })
          .where(and(eq(pratos.id, item.pratoId), eq(pratos.disponibilidade, "estoque")));
      }
    }
  }).catch((err) => {
    if (err instanceof Error && err.message === "CONCORRENCIA") {
      throw new Error("Outra pessoa acabou de mudar este pedido. Recarregue a página.");
    }
    throw err;
  });

  revalidatePath("/admin/pedidos");
  // O cancelamento devolve estoque, o que pode trazer um prato de volta à vitrine.
  if (novoStatus === "cancelado") updateTag(TAG_VITRINE);

  return {};
}
