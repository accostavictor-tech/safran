import type { MacroData } from "@/lib/calculations";

/**
 * O que a loja pública mostra de um prato.
 *
 * Não inclui custo, margem nem CMV de propósito: este objeto atravessa a
 * fronteira servidor -> cliente e nada de precificação interna deve sair daqui.
 *
 * Vive em lib/ (e não junto da consulta) para poder ser importado por
 * componentes de cliente sem arrastar o cliente do banco para o bundle.
 */
export interface PratoVitrine {
  id: string;
  codigo: number;
  nome: string;
  slug: string;
  descricao: string | null;
  fotoUrl: string | null;
  categoria: string | null;
  precoVendaCentavos: number;
  pesoTotalG: number;
  macros: MacroData;
  temGluten: boolean;
  temLactose: boolean;
  estoqueLimitado: boolean;
  estoqueUnidades: number;
}

/** Categorias presentes na vitrine, para agrupar o cardápio. */
export function agruparPorCategoria(lista: PratoVitrine[]): { categoria: string; pratos: PratoVitrine[] }[] {
  const mapa = new Map<string, PratoVitrine[]>();
  for (const prato of lista) {
    const chave = prato.categoria?.trim() || "Outros";
    const atual = mapa.get(chave);
    if (atual) atual.push(prato);
    else mapa.set(chave, [prato]);
  }
  return [...mapa.entries()].map(([categoria, pratos]) => ({ categoria, pratos }));
}
