/**
 * Preço de um kit montado pelo cliente.
 *
 * A regra: o kit tem preço fechado por N pratos. Prato cujo preço de venda
 * passa do preço por prato do kit entra com a diferença como adicional. É o
 * que impede o mix de destruir a margem — um kit de 5 por R$ 139,90 dá
 * R$ 27,98 por prato, e cinco camarões grelhados a R$ 47,90 custariam mais em
 * matéria-prima do que o kit inteiro cobra.
 *
 * Quem escolhe só pratos da faixa base não paga nada a mais, que é o efeito
 * desejado: o kit fica simples para a maioria e honesto no extremo.
 */

export interface PratoDoKit {
  id: string;
  nome: string;
  precoVendaCentavos: number;
}

export interface KitBase {
  quantidadePratos: number;
  precoCentavos: number;
}

/** Quanto do preço do kit cabe a cada prato. Arredonda para cima, para a soma nunca ficar abaixo do preço fechado. */
export function precoPorPratoCentavos(kit: KitBase): number {
  if (kit.quantidadePratos <= 0) return 0;
  return Math.ceil(kit.precoCentavos / kit.quantidadePratos);
}

export function adicionalDoPrato(kit: KitBase, prato: PratoDoKit): number {
  return Math.max(0, prato.precoVendaCentavos - precoPorPratoCentavos(kit));
}

export interface ResumoKit {
  /** Preço fechado do kit, sem adicionais. */
  baseCentavos: number;
  /** Soma dos adicionais dos pratos acima da faixa. */
  adicionaisCentavos: number;
  /** O que o cliente paga por uma unidade deste kit. */
  totalCentavos: number;
  /** Quantos pratos ainda faltam escolher. Negativo nunca: a UI limita a escolha. */
  faltam: number;
  completo: boolean;
}

/**
 * `escolhidos` é a lista dos pratos na ordem em que foram escolhidos, com
 * repetição — pedir três vezes o mesmo prato é legítimo e cada um conta.
 */
export function resumirKit(kit: KitBase, escolhidos: PratoDoKit[]): ResumoKit {
  const adicionaisCentavos = escolhidos.reduce((acc, p) => acc + adicionalDoPrato(kit, p), 0);
  const faltam = Math.max(0, kit.quantidadePratos - escolhidos.length);
  return {
    baseCentavos: kit.precoCentavos,
    adicionaisCentavos,
    totalCentavos: kit.precoCentavos + adicionaisCentavos,
    faltam,
    completo: escolhidos.length === kit.quantidadePratos,
  };
}
