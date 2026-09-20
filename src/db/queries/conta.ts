import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientes, creditoMovimentos, enderecos, pedidos, zonasEntrega } from "@/db/schema";

export async function buscarCliente(clienteId: string) {
  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
  return cliente ?? null;
}

export interface EnderecoDoCliente {
  id: string;
  cep: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  referencia: string | null;
  padrao: boolean;
  /** Nulo quando o bairro salvo deixou de ser atendido — o checkout precisa avisar. */
  zonaNome: string | null;
  freteCentavos: number | null;
}

export async function listarEnderecos(clienteId: string): Promise<EnderecoDoCliente[]> {
  return db
    .select({
      id: enderecos.id,
      cep: enderecos.cep,
      logradouro: enderecos.logradouro,
      numero: enderecos.numero,
      complemento: enderecos.complemento,
      bairro: enderecos.bairro,
      referencia: enderecos.referencia,
      padrao: enderecos.padrao,
      zonaNome: zonasEntrega.nome,
      freteCentavos: zonasEntrega.freteCentavos,
    })
    .from(enderecos)
    .leftJoin(zonasEntrega, and(eq(zonasEntrega.id, enderecos.zonaId), eq(zonasEntrega.ativa, true)))
    .where(eq(enderecos.clienteId, clienteId))
    .orderBy(desc(enderecos.padrao), desc(enderecos.createdAt));
}

export interface MovimentoCredito {
  id: string;
  centavos: number;
  motivo: string;
  createdAt: Date;
  pedidoId: string | null;
  pedidoCodigo: number | null;
}

/**
 * Extrato da carteira, do mais recente ao mais antigo.
 *
 * Traz o código do pedido junto: um lançamento de crédito sem a compra que o
 * gerou é um número solto, e a primeira pergunta de quem vê o extrato é "de
 * onde veio isso".
 */
export async function extratoCredito(clienteId: string, limite = 50): Promise<MovimentoCredito[]> {
  return db
    .select({
      id: creditoMovimentos.id,
      centavos: creditoMovimentos.centavos,
      motivo: creditoMovimentos.motivo,
      createdAt: creditoMovimentos.createdAt,
      pedidoId: creditoMovimentos.pedidoId,
      pedidoCodigo: pedidos.codigo,
    })
    .from(creditoMovimentos)
    .leftJoin(pedidos, eq(pedidos.id, creditoMovimentos.pedidoId))
    .where(eq(creditoMovimentos.clienteId, clienteId))
    .orderBy(desc(creditoMovimentos.createdAt))
    .limit(limite);
}

/** Quanto já voltou em crédito na vida da conta — só as entradas. */
export async function totalAcumuladoCentavos(clienteId: string): Promise<number> {
  const [linha] = await db
    .select({
      total: sql<number>`coalesce(sum(case when ${creditoMovimentos.centavos} > 0 then ${creditoMovimentos.centavos} else 0 end), 0)::int`,
    })
    .from(creditoMovimentos)
    .where(eq(creditoMovimentos.clienteId, clienteId));
  return Number(linha?.total ?? 0);
}
