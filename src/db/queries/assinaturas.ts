import { and, asc, desc, eq, lte, ne } from "drizzle-orm";
import { db } from "@/db";
import { assinaturaCiclos, assinaturas, clientes, enderecos, kits, zonasEntrega } from "@/db/schema";

export type Assinatura = typeof assinaturas.$inferSelect;

/** Assinatura com o que a tela precisa junto: kit, endereço e zona de entrega. */
export interface AssinaturaCompleta {
  assinatura: Assinatura;
  kit: { id: string; nome: string; slug: string; quantidadePratos: number; precoCentavos: number };
  endereco: {
    id: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    referencia: string | null;
  } | null;
  zona: { id: string; nome: string; freteCentavos: number; freteGratisAcimaCentavos: number | null } | null;
}

const SELECAO = {
  assinatura: assinaturas,
  kitId: kits.id,
  kitNome: kits.nome,
  kitSlug: kits.slug,
  kitQuantidade: kits.quantidadePratos,
  kitPreco: kits.precoCentavos,
  enderecoId: enderecos.id,
  logradouro: enderecos.logradouro,
  numero: enderecos.numero,
  complemento: enderecos.complemento,
  bairro: enderecos.bairro,
  referencia: enderecos.referencia,
  zonaId: zonasEntrega.id,
  zonaNome: zonasEntrega.nome,
  zonaFrete: zonasEntrega.freteCentavos,
  zonaFreteGratis: zonasEntrega.freteGratisAcimaCentavos,
};

/**
 * As três consultas abaixo compartilham os mesmos joins, então o resultado é
 * sempre a mesma forma achatada. `montar` reconstrói o objeto aninhado a partir
 * dela, em um lugar só.
 */
type LinhaAchatada = Record<string, unknown> & { assinatura: Assinatura };

function montar(linha: LinhaAchatada): AssinaturaCompleta {
  return {
    assinatura: linha.assinatura,
    kit: {
      id: linha.kitId as string,
      nome: linha.kitNome as string,
      slug: linha.kitSlug as string,
      quantidadePratos: linha.kitQuantidade as number,
      precoCentavos: linha.kitPreco as number,
    },
    endereco:
      linha.enderecoId === null || linha.enderecoId === undefined
        ? null
        : {
            id: linha.enderecoId as string,
            logradouro: linha.logradouro as string,
            numero: linha.numero as string,
            complemento: (linha.complemento as string | null) ?? null,
            bairro: linha.bairro as string,
            referencia: (linha.referencia as string | null) ?? null,
          },
    zona:
      linha.zonaId === null || linha.zonaId === undefined
        ? null
        : {
            id: linha.zonaId as string,
            nome: linha.zonaNome as string,
            freteCentavos: linha.zonaFrete as number,
            freteGratisAcimaCentavos: (linha.zonaFreteGratis as number | null) ?? null,
          },
  };
}

/** Assinaturas de um cliente, da mais recente para a mais antiga. */
export async function listarAssinaturasDoCliente(clienteId: string): Promise<AssinaturaCompleta[]> {
  const linhas = await db
    .select(SELECAO)
    .from(assinaturas)
    .innerJoin(kits, eq(kits.id, assinaturas.kitId))
    .leftJoin(enderecos, eq(enderecos.id, assinaturas.enderecoId))
    .leftJoin(zonasEntrega, and(eq(zonasEntrega.id, enderecos.zonaId), eq(zonasEntrega.ativa, true)))
    .where(and(eq(assinaturas.clienteId, clienteId), ne(assinaturas.status, "cancelada")))
    .orderBy(desc(assinaturas.createdAt));

  return linhas.map((l) => montar(l as LinhaAchatada));
}

export async function buscarAssinatura(id: string): Promise<AssinaturaCompleta | null> {
  const [linha] = await db
    .select(SELECAO)
    .from(assinaturas)
    .innerJoin(kits, eq(kits.id, assinaturas.kitId))
    .leftJoin(enderecos, eq(enderecos.id, assinaturas.enderecoId))
    .leftJoin(zonasEntrega, and(eq(zonasEntrega.id, enderecos.zonaId), eq(zonasEntrega.ativa, true)))
    .where(eq(assinaturas.id, id))
    .limit(1);

  return linha ? montar(linha as LinhaAchatada) : null;
}

/**
 * Assinaturas ativas cuja entrega já venceu.
 *
 * É o que a geração de pedidos consome. Usa `lte` sobre o instante atual, e não
 * "hoje": a data de entrega guarda hora, e comparar por dia faria a primeira
 * geração do dia pegar entregas que ainda não chegaram.
 */
export async function assinaturasVencidas(ate = new Date()): Promise<AssinaturaCompleta[]> {
  const linhas = await db
    .select(SELECAO)
    .from(assinaturas)
    .innerJoin(kits, eq(kits.id, assinaturas.kitId))
    .leftJoin(enderecos, eq(enderecos.id, assinaturas.enderecoId))
    .leftJoin(zonasEntrega, and(eq(zonasEntrega.id, enderecos.zonaId), eq(zonasEntrega.ativa, true)))
    .where(and(eq(assinaturas.status, "ativa"), lte(assinaturas.proximaEntrega, ate)))
    .orderBy(asc(assinaturas.proximaEntrega));

  return linhas.map((l) => montar(l as LinhaAchatada));
}

/** Todas as assinaturas para o painel, com o nome do cliente resolvido. */
export async function listarAssinaturasPainel() {
  return db
    .select({
      assinatura: assinaturas,
      clienteNome: clientes.nome,
      clienteTelefone: clientes.telefone,
      kitNome: kits.nome,
      kitQuantidade: kits.quantidadePratos,
      kitPreco: kits.precoCentavos,
      bairro: enderecos.bairro,
    })
    .from(assinaturas)
    .innerJoin(clientes, eq(clientes.id, assinaturas.clienteId))
    .innerJoin(kits, eq(kits.id, assinaturas.kitId))
    .leftJoin(enderecos, eq(enderecos.id, assinaturas.enderecoId))
    .orderBy(asc(assinaturas.proximaEntrega));
}

export async function listarCiclos(assinaturaId: string, limite = 12) {
  return db
    .select()
    .from(assinaturaCiclos)
    .where(eq(assinaturaCiclos.assinaturaId, assinaturaId))
    .orderBy(desc(assinaturaCiclos.dataEntrega))
    .limit(limite);
}
