"use server";

import { revalidatePath } from "next/cache";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assinaturaCiclos,
  assinaturas,
  clientes,
  pedidoEventos,
  pedidoItens,
  pedidos,
  pratos,
  type ComposicaoKitSnapshot,
} from "@/db/schema";
import { assinaturasVencidas, type AssinaturaCompleta } from "@/db/queries/assinaturas";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import { composicaoEfetiva, proximaData } from "@/lib/assinaturas";
import { resumirKit } from "@/lib/kits";
import { resolverFrete } from "@/lib/loja";
import { reaisParaCentavos } from "@/lib/calculations";
import { eViolacaoDeUnicidade } from "@/lib/db-erros";

export interface ResultadoGeracao {
  gerados: number;
  pulados: { codigo: number; motivo: string }[];
}

function agrupar(escolhidos: { id: string; nome: string }[]): ComposicaoKitSnapshot[] {
  const mapa = new Map<string, ComposicaoKitSnapshot>();
  for (const p of escolhidos) {
    const atual = mapa.get(p.id);
    if (atual) atual.quantidade += 1;
    else mapa.set(p.id, { pratoId: p.id, nome: p.nome, quantidade: 1 });
  }
  return [...mapa.values()];
}

/**
 * Transforma uma assinatura vencida em pedido.
 *
 * Devolve o motivo em vez de lançar quando a assinatura não pode virar pedido:
 * uma entrega problemática não pode derrubar a geração das outras.
 */
async function gerarUma(
  completa: AssinaturaCompleta,
  custoPorPrato: Map<string, number>
): Promise<string | null> {
  const { assinatura, kit, endereco, zona } = completa;
  if (!endereco) return "sem endereço cadastrado";
  if (!zona) return `bairro ${endereco.bairro} está fora das zonas de entrega`;

  const composicao = composicaoEfetiva(assinatura);
  if (composicao.length !== kit.quantidadePratos) {
    return `a composição tem ${composicao.length} pratos e o kit pede ${kit.quantidadePratos}`;
  }

  const disponiveis = await db
    .select({
      id: pratos.id,
      nome: pratos.nome,
      precoVendaCentavos: pratos.precoVendaCentavos,
      publicado: pratos.publicado,
      disponibilidade: pratos.disponibilidade,
      estoqueUnidades: pratos.estoqueUnidades,
    })
    .from(pratos)
    .where(inArray(pratos.id, [...new Set(composicao)]));
  const porId = new Map(disponiveis.map((p) => [p.id, p]));

  const demanda = new Map<string, number>();
  for (const id of composicao) demanda.set(id, (demanda.get(id) ?? 0) + 1);

  for (const [pratoId, quantidade] of demanda) {
    const prato = porId.get(pratoId);
    if (!prato || !prato.publicado || prato.precoVendaCentavos === null || prato.disponibilidade === "indisponivel") {
      return `"${prato?.nome ?? "um prato"}" saiu do cardápio`;
    }
    if (prato.disponibilidade === "estoque" && prato.estoqueUnidades < quantidade) {
      return `"${prato.nome}" tem só ${prato.estoqueUnidades} em estoque`;
    }
  }

  const escolhidos = composicao.map((id) => {
    const prato = porId.get(id)!;
    return { id: prato.id, nome: prato.nome, precoVendaCentavos: prato.precoVendaCentavos! };
  });

  const subtotalCentavos = resumirKit(kit, escolhidos).totalCentavos;
  const freteCentavos = resolverFrete(zona, subtotalCentavos);
  const totalCentavos = subtotalCentavos + freteCentavos;

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, assinatura.clienteId)).limit(1);
  if (!cliente) return "cliente não encontrado";

  const dataEntrega = assinatura.proximaEntrega;

  try {
    await db.transaction(async (tx) => {
      // O ciclo entra primeiro: a unicidade (assinatura, data) é o que impede
      // duas execuções da geração de cobrarem a mesma entrega duas vezes.
      const [ciclo] = await tx
        .insert(assinaturaCiclos)
        .values({
          assinaturaId: assinatura.id,
          dataEntrega,
          composicao: agrupar(escolhidos),
        })
        .returning({ id: assinaturaCiclos.id });

      const [pedido] = await tx
        .insert(pedidos)
        .values({
          clienteId: cliente.id,
          status: "aguardando_pagamento",
          nomeCliente: cliente.nome || "Assinante",
          telefoneCliente: cliente.telefone,
          enderecoSnapshot: {
            logradouro: endereco.logradouro,
            numero: endereco.numero,
            complemento: endereco.complemento,
            bairro: endereco.bairro,
            referencia: endereco.referencia,
            zona: zona.nome,
          },
          subtotalCentavos,
          freteCentavos,
          totalCentavos,
          observacoes: assinatura.observacoes,
        })
        .returning({ id: pedidos.id });

      await tx.insert(pedidoItens).values({
        pedidoId: pedido.id,
        pratoId: null,
        kitId: kit.id,
        nomeSnapshot: kit.nome,
        precoUnitarioCentavos: subtotalCentavos,
        custoUnitarioSnapshotCentavos: escolhidos.reduce((acc, p) => acc + (custoPorPrato.get(p.id) ?? 0), 0),
        quantidade: 1,
        ordem: 0,
        composicaoSnapshot: agrupar(escolhidos),
      });

      await tx.insert(pedidoEventos).values({
        pedidoId: pedido.id,
        para: "aguardando_pagamento",
        autor: "assinatura",
      });

      await tx.update(assinaturaCiclos).set({ pedidoId: pedido.id }).where(eq(assinaturaCiclos.id, ciclo.id));

      for (const [pratoId, quantidade] of demanda) {
        const prato = porId.get(pratoId)!;
        if (prato.disponibilidade !== "estoque") continue;
        const baixados = await tx
          .update(pratos)
          .set({ estoqueUnidades: sql`${pratos.estoqueUnidades} - ${quantidade}` })
          .where(and(eq(pratos.id, pratoId), gte(pratos.estoqueUnidades, quantidade)))
          .returning({ id: pratos.id });
        if (baixados.length === 0) throw new Error(`ESTOQUE:${prato.nome}`);
      }

      await tx
        .update(assinaturas)
        .set({
          proximaEntrega: proximaData(dataEntrega, assinatura.frequencia),
          // A escolha do ciclo vale uma vez; o próximo volta à composição padrão.
          composicaoProxima: null,
          updatedAt: new Date(),
        })
        .where(eq(assinaturas.id, assinatura.id));
    });
  } catch (err) {
    if (eViolacaoDeUnicidade(err)) return "essa entrega já tinha sido gerada";
    const msg = err instanceof Error ? err.message : "";
    if (msg.startsWith("ESTOQUE:")) return `"${msg.split(":")[1]}" esgotou durante a geração`;
    throw err;
  }

  return null;
}

/**
 * Gera os pedidos de todas as assinaturas ativas com entrega vencida.
 *
 * É disparado à mão no painel, e não por agendador: sem cobrança automática,
 * alguém da Safran precisa olhar a lista antes de mandar os pedidos para a
 * produção. Rodar duas vezes é seguro.
 */
export async function gerarPedidosDeAssinaturasAction(): Promise<ResultadoGeracao> {
  const vencidas = await assinaturasVencidas();
  if (vencidas.length === 0) return { gerados: 0, pulados: [] };

  // Custo por prato de uma vez só, em vez de uma consulta por assinatura.
  const precificacao = await listarPratosComPrecificacao();
  const custoPorPrato = new Map(
    precificacao.map((l) => [l.prato.id, reaisParaCentavos(l.precificacao.custoTotal)])
  );

  let gerados = 0;
  const pulados: { codigo: number; motivo: string }[] = [];

  for (const completa of vencidas) {
    const motivo = await gerarUma(completa, custoPorPrato);
    if (motivo) pulados.push({ codigo: completa.assinatura.codigo, motivo });
    else gerados++;
  }

  revalidatePath("/admin/assinaturas");
  revalidatePath("/admin/pedidos");
  return { gerados, pulados };
}
