/**
 * Por que um prato está (ou não está) no cardápio da loja.
 *
 * A regra de quem aparece na vitrine mora em `db/queries/loja.ts`; aqui ela é
 * traduzida em algo legível no admin. Sem isso, a lista de pratos mostra 19
 * pratos "ativos" e a loja mostra zero, sem nada explicando a diferença —
 * `ativo` é uso interno (a ficha técnica segue valendo), `publicado` é o que
 * põe o prato à venda.
 */
export type StatusPublicacao = "publicado" | "sem_preco" | "rascunho" | "indisponivel" | "sem_estoque";

export interface PublicacaoPrato {
  status: StatusPublicacao;
  /** Está de fato visível no cardápio? Espelha FILTRO_VITRINE. */
  naLoja: boolean;
}

interface EntradaPublicacao {
  publicado: boolean;
  precoVendaCentavos: number | null;
  disponibilidade: "sempre" | "estoque" | "indisponivel";
  estoqueUnidades: number;
}

export function statusPublicacao(prato: EntradaPublicacao): PublicacaoPrato {
  // Ordem importa: o motivo mostrado é o primeiro que o sócio precisa resolver.
  if (prato.precoVendaCentavos === null) return { status: "sem_preco", naLoja: false };
  if (!prato.publicado) return { status: "rascunho", naLoja: false };
  if (prato.disponibilidade === "indisponivel") return { status: "indisponivel", naLoja: false };
  if (prato.disponibilidade === "estoque" && prato.estoqueUnidades <= 0) {
    return { status: "sem_estoque", naLoja: false };
  }
  return { status: "publicado", naLoja: true };
}

export const PUBLICACAO_LABEL: Record<StatusPublicacao, string> = {
  publicado: "Na loja",
  sem_preco: "Sem preço",
  rascunho: "Fora da loja",
  indisponivel: "Indisponível",
  sem_estoque: "Sem estoque",
};

export const PUBLICACAO_AJUDA: Record<StatusPublicacao, string> = {
  publicado: "Visível no cardápio e disponível para pedido.",
  sem_preco: "Falta definir o preço de venda: sem ele o prato não pode ir para a loja.",
  rascunho: "Tem preço, mas a caixa “Publicado na loja” está desmarcada.",
  indisponivel: "Marcado como indisponível na ficha do prato.",
  sem_estoque: "Controlado por estoque e o estoque está zerado.",
};

export const PUBLICACAO_VARIANTE: Record<StatusPublicacao, "success" | "warning" | "secondary"> = {
  publicado: "success",
  sem_preco: "warning",
  rascunho: "secondary",
  indisponivel: "secondary",
  sem_estoque: "warning",
};
