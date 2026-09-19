import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { creditoMovimentos, pedidoEventos, pedidoItens, pedidos } from "@/db/schema";

export type Pedido = typeof pedidos.$inferSelect;
export type PedidoItem = typeof pedidoItens.$inferSelect;
export type PedidoStatus = Pedido["status"];

export interface EnderecoSnapshot {
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  referencia: string | null;
  zona: string;
}

export function lerEndereco(pedido: Pedido): EnderecoSnapshot | null {
  return (pedido.enderecoSnapshot as EnderecoSnapshot | null) ?? null;
}

/**
 * Busca pelo id (uuid), não pelo código sequencial: a página de confirmação é
 * pública, e código sequencial seria adivinhável — daria para ler o nome,
 * telefone e endereço de pedidos alheios.
 */
export async function buscarPedidoPorId(id: string) {
  const [pedido] = await db.select().from(pedidos).where(eq(pedidos.id, id)).limit(1);
  if (!pedido) return null;

  const itens = await db
    .select()
    .from(pedidoItens)
    .where(eq(pedidoItens.pedidoId, id))
    .orderBy(asc(pedidoItens.ordem));

  return { pedido, itens };
}

/**
 * Pedidos para o painel interno, com itens e saldo de cashback do cliente já
 * resolvidos em 3 consultas fixas, independente de quantos pedidos venham.
 */
export async function listarPedidosPainel(limite = 60) {
  const lista = await db.select().from(pedidos).orderBy(desc(pedidos.createdAt)).limit(limite);
  if (lista.length === 0) return [];

  const ids = lista.map((p) => p.id);
  const clienteIds = [...new Set(lista.map((p) => p.clienteId).filter((id): id is string => id !== null))];

  const [itens, saldos] = await Promise.all([
    db.select().from(pedidoItens).where(inArray(pedidoItens.pedidoId, ids)).orderBy(asc(pedidoItens.ordem)),
    clienteIds.length > 0
      ? db
          .select({
            clienteId: creditoMovimentos.clienteId,
            saldo: sql<number>`coalesce(sum(${creditoMovimentos.centavos}), 0)::int`,
          })
          .from(creditoMovimentos)
          .where(inArray(creditoMovimentos.clienteId, clienteIds))
          .groupBy(creditoMovimentos.clienteId)
      : Promise.resolve([]),
  ]);

  const porPedido = new Map<string, PedidoItem[]>();
  for (const item of itens) {
    const atual = porPedido.get(item.pedidoId);
    if (atual) atual.push(item);
    else porPedido.set(item.pedidoId, [item]);
  }
  const saldoPorCliente = new Map(saldos.map((s) => [s.clienteId, Number(s.saldo)]));

  return lista.map((pedido) => ({
    pedido,
    itens: porPedido.get(pedido.id) ?? [],
    saldoCreditoCentavos: pedido.clienteId ? (saldoPorCliente.get(pedido.clienteId) ?? 0) : 0,
  }));
}

export async function listarEventosPedido(pedidoId: string) {
  return db
    .select()
    .from(pedidoEventos)
    .where(eq(pedidoEventos.pedidoId, pedidoId))
    .orderBy(asc(pedidoEventos.createdAt));
}
