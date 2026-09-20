import { normalizarBairro } from "@/lib/loja";

export interface ZonaComBairros {
  id: string;
  nome: string;
  bairros: string[];
  freteCentavos: number;
}

/** Zona pelo bairro, comparando sem acento e sem caixa. */
export function resolverZonaPorBairro<T extends ZonaComBairros>(zonas: T[], bairro: string): T | null {
  const alvo = normalizarBairro(bairro);
  return zonas.find((z) => z.bairros.some((b) => normalizarBairro(b) === alvo)) ?? null;
}

export interface EnderecoComparavel {
  logradouro: string;
  numero: string;
  bairro: string;
  complemento?: string | null;
}

/**
 * Identidade de um endereço para fins de "é o mesmo lugar".
 *
 * Sem isto o checkout grava um endereço novo a cada pedido e a agenda do
 * cliente vira uma lista do mesmo apartamento repetido dez vezes.
 */
export function chaveEndereco(e: EnderecoComparavel): string {
  const limpar = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  return [limpar(e.logradouro), limpar(e.numero), limpar(e.bairro), limpar(e.complemento ?? "")].join("|");
}

export function formatarEndereco(e: EnderecoComparavel & { referencia?: string | null }): string {
  const linha = `${e.logradouro}, ${e.numero}`;
  const comComplemento = e.complemento ? `${linha} — ${e.complemento}` : linha;
  return `${comComplemento} · ${e.bairro}`;
}
