"use server";

import { redirect } from "next/navigation";
import { and, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  clientes,
  creditoMovimentos,
  cupons,
  enderecos,
  pedidoEventos,
  pedidoItens,
  pedidos,
  pratos,
  zonasEntrega,
} from "@/db/schema";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import {
  buscarCupomPorCodigo,
  contarUsosDoTelefone,
  paraRegra,
  telefoneJaComprou,
} from "@/db/queries/cupons";
import { aplicarCupom, normalizarCodigoCupom, type CupomAplicado } from "@/lib/cupom";
import { obterSessaoCliente } from "@/lib/auth";
import { chaveEndereco, resolverZonaPorBairro } from "@/lib/enderecos";
import { saldoCreditoCentavos } from "@/db/queries/cupons";
import { creditoAplicavel, MOTIVO_USO } from "@/lib/cashback";
import { reaisParaCentavos } from "@/lib/calculations";
import {
  calcularSubtotal,
  calcularTotal,
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
  cupom: z.string().trim().nullable(),
  usarCredito: z.coerce.boolean().default(false),
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
    cupom: texto("cupom"),
    usarCredito: formData.get("usarCredito") === "on",
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
  const zona = resolverZonaPorBairro(zonas, dados.bairro);
  if (!zona) {
    return { erro: "Ainda não entregamos nesse bairro. Fale com a gente no WhatsApp." };
  }

  // Cupom: aqui é onde a decisão vale. A prévia no checkout não checa as regras
  // por cliente (exigiriam identidade antes de o pedido existir), então todas
  // as regras são reavaliadas neste ponto.
  let cupomAplicado: CupomAplicado | null = null;
  if (dados.cupom) {
    const codigo = normalizarCodigoCupom(dados.cupom);
    const cupom = await buscarCupomPorCodigo(codigo);
    if (!cupom) return { erro: "Cupom não encontrado." };

    const [usosDoCliente, jaComprou] = await Promise.all([
      contarUsosDoTelefone(codigo, telefone),
      telefoneJaComprou(telefone),
    ]);

    const resultado = aplicarCupom(paraRegra(cupom), {
      subtotalCentavos,
      usosDoCliente,
      clienteJaComprou: jaComprou,
    });
    if (!resultado.ok) return { erro: resultado.mensagem };
    cupomAplicado = resultado;
  }

  const freteBase = resolverFrete(zona, subtotalCentavos);
  const freteCentavos = cupomAplicado?.freteGratis ? 0 : freteBase;
  const descontoCupomCentavos = cupomAplicado?.descontoCentavos ?? 0;

  /**
   * Crédito só entra com cliente logado, e o saldo é lido do banco — nunca do
   * que o navegador mandou. Sem sessão, saber um telefone permitiria gastar o
   * dinheiro de outra pessoa.
   */
  const sessaoCliente = await obterSessaoCliente();
  let creditoUsadoCentavos = 0;
  if (dados.usarCredito) {
    if (!sessaoCliente) return { erro: "Entre na sua conta para usar o cashback." };
    if (sessaoCliente.telefone !== telefone) {
      return { erro: "O WhatsApp do pedido é diferente do da conta em que você está logado." };
    }
    const saldo = await saldoCreditoCentavos(sessaoCliente.clienteId);
    // O crédito desconta do que sobrou depois do cupom, e nunca passa disso.
    creditoUsadoCentavos = creditoAplicavel(saldo, Math.max(0, subtotalCentavos - descontoCupomCentavos));
    if (creditoUsadoCentavos === 0) return { erro: "Você ainda não tem cashback suficiente para usar." };
  }

  const descontoCentavos = descontoCupomCentavos + creditoUsadoCentavos;
  const totalCentavos = calcularTotal(subtotalCentavos, freteCentavos, descontoCentavos);

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

      // Guarda na agenda do cliente, sem duplicar: antes disto cada pedido
      // criava uma linha nova e a agenda virava o mesmo apartamento repetido.
      const jaSalvos = await tx.select().from(enderecos).where(eq(enderecos.clienteId, cliente.id));
      const chave = chaveEndereco(dados);
      const existente = jaSalvos.find((e) => chaveEndereco(e) === chave);
      if (existente) {
        await tx
          .update(enderecos)
          .set({ referencia: dados.referencia, zonaId: zona.id })
          .where(eq(enderecos.id, existente.id));
      } else {
        await tx.insert(enderecos).values({
          clienteId: cliente.id,
          logradouro: dados.logradouro,
          numero: dados.numero,
          complemento: dados.complemento,
          bairro: dados.bairro,
          referencia: dados.referencia,
          zonaId: zona.id,
          padrao: jaSalvos.length === 0,
        });
      }

      const [pedido] = await tx
        .insert(pedidos)
        .values({
          clienteId: cliente.id,
          status: "aguardando_pagamento",
          nomeCliente: dados.nome,
          telefoneCliente: telefone,
          enderecoSnapshot,
          subtotalCentavos,
          descontoCentavos,
          freteCentavos,
          totalCentavos,
          cupomCodigo: cupomAplicado?.codigo ?? null,
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

      if (creditoUsadoCentavos > 0 && sessaoCliente) {
        await tx.insert(creditoMovimentos).values({
          clienteId: cliente.id,
          pedidoId: pedido.id,
          centavos: -creditoUsadoCentavos,
          motivo: MOTIVO_USO,
        });

        // Relê o saldo dentro da transação: se outro pedido do mesmo cliente
        // gastou o crédito em paralelo, o saldo fica negativo e este pedido cai.
        const [{ saldo }] = await tx
          .select({ saldo: sql<number>`coalesce(sum(${creditoMovimentos.centavos}), 0)::int` })
          .from(creditoMovimentos)
          .where(eq(creditoMovimentos.clienteId, cliente.id));
        if (Number(saldo) < 0) throw new Error("CREDITO_INSUFICIENTE");
      }

      if (cupomAplicado) {
        // O limite total entra na condição do UPDATE: se o último uso foi levado
        // entre a validação e aqui, nenhuma linha muda e o pedido cai.
        const usados = await tx
          .update(cupons)
          .set({ usos: sql`${cupons.usos} + 1` })
          .where(
            and(
              eq(cupons.codigo, cupomAplicado.codigo),
              eq(cupons.ativo, true),
              or(isNull(cupons.limiteTotal), lt(cupons.usos, cupons.limiteTotal))
            )
          )
          .returning({ id: cupons.id });
        if (usados.length === 0) throw new Error("CUPOM_ESGOTADO");
      }

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
    if (msg === "CUPOM_ESGOTADO") {
      return { erro: "Esse cupom acabou de esgotar." };
    }
    if (msg === "CREDITO_INSUFICIENTE") {
      return { erro: "Seu cashback foi usado em outro pedido. Recarregue a página." };
    }
    throw err;
  }

  redirect(`/pedido/${pedidoId}`);
}
