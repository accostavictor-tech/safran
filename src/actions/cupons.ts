"use server";

import { inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { pratos } from "@/db/schema";
import { buscarCupomPorCodigo, paraRegra } from "@/db/queries/cupons";
import { aplicarCupom, normalizarCodigoCupom } from "@/lib/cupom";
import { calcularSubtotal, type ItemCarrinho } from "@/lib/loja";

export interface PreviaCupom {
  ok: boolean;
  mensagem?: string;
  codigo?: string;
  descontoCentavos?: number;
  freteGratis?: boolean;
}

const entradaSchema = z.object({
  codigo: z.string().trim().min(1).max(40),
  itens: z
    .array(z.object({ pratoId: z.string().uuid(), quantidade: z.coerce.number().int().min(1).max(50) }))
    .min(1),
});

/**
 * Prévia do cupom para o checkout. Confere as regras que não dependem de
 * identidade (ativo, validade, mínimo, limite total). As regras por cliente
 * (uso repetido, primeira compra) só podem ser avaliadas na criação do pedido,
 * e é lá que a decisão vale — esta função existe para o cliente ver o desconto
 * antes de confirmar, não para autorizar nada.
 */
export async function conferirCupomAction(codigo: string, itens: ItemCarrinho[]): Promise<PreviaCupom> {
  const parsed = entradaSchema.safeParse({ codigo, itens });
  if (!parsed.success) return { ok: false, mensagem: "Cupom inválido." };

  const normalizado = normalizarCodigoCupom(parsed.data.codigo);
  const cupom = await buscarCupomPorCodigo(normalizado);
  if (!cupom) return { ok: false, mensagem: "Cupom não encontrado." };

  // Subtotal recalculado do catálogo, nunca vindo do navegador.
  const ids = [...new Set(parsed.data.itens.map((i) => i.pratoId))];
  const linhas = await db
    .select({ id: pratos.id, precoVendaCentavos: pratos.precoVendaCentavos })
    .from(pratos)
    .where(inArray(pratos.id, ids));
  const precos = new Map(linhas.map((l) => [l.id, l.precoVendaCentavos ?? 0]));

  const subtotalCentavos = calcularSubtotal(
    parsed.data.itens.map((i) => ({
      precoUnitarioCentavos: precos.get(i.pratoId) ?? 0,
      quantidade: i.quantidade,
    }))
  );

  const resultado = aplicarCupom(paraRegra(cupom), {
    subtotalCentavos,
    usosDoCliente: 0,
    clienteJaComprou: false,
  });

  if (!resultado.ok) return { ok: false, mensagem: resultado.mensagem };
  return {
    ok: true,
    codigo: resultado.codigo,
    descontoCentavos: resultado.descontoCentavos,
    freteGratis: resultado.freteGratis,
  };
}
