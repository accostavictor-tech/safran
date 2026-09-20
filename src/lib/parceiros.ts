/**
 * Regras da parceria aplicadas a um pedido.
 *
 * Desconto e comissão são coisas diferentes e não se somam no mesmo lugar: o
 * desconto sai do que o cliente paga, a comissão é despesa da Safran sobre o
 * que ela recebeu. Tratar as duas como "percentual do parceiro" seria o jeito
 * mais rápido de pagar comissão sobre um valor que nunca entrou.
 */

export type TipoParceiro = "empresa" | "afiliado" | "nutricionista";

export const TIPO_PARCEIRO_LABEL: Record<TipoParceiro, string> = {
  empresa: "Empresa",
  afiliado: "Afiliado",
  nutricionista: "Nutricionista",
};

export const TIPO_PARCEIRO_DESCRICAO: Record<TipoParceiro, string> = {
  empresa: "Compra ou revende com tabela própria. Use o desconto.",
  afiliado: "Divulga com código próprio e recebe comissão sobre o que vender.",
  nutricionista: "Prescreve para pacientes; o pedido fica rastreável, com ou sem comissão.",
};

export interface RegraParceiro {
  codigoIndicacao: string;
  tipo: TipoParceiro;
  descontoPct: number;
  comissaoPct: number;
  ativo: boolean;
}

export interface EfeitoParceiro {
  /** Quanto sai do que o cliente paga. */
  descontoCentavos: number;
  /** Quanto a Safran passa a dever ao parceiro. Não altera o total do cliente. */
  comissaoCentavos: number;
}

/**
 * Código como ele é guardado e comparado.
 *
 * Espaço, ponto e underscore viram hífen em vez de sumir: quem digita
 * "academia x" espera ACADEMIA-X, e apagar o espaço produziria ACADEMIAX —
 * um código que o parceiro nunca reconheceria ao divulgar. A mesma função
 * roda no cadastro e no checkout, então os dois lados sempre concordam.
 */
export function normalizarCodigoParceiro(bruto: string): string {
  return bruto
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s._]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Comissão incide sobre o subtotal JÁ DESCONTADO.
 *
 * Se incidisse sobre o cheio, uma empresa com 20% de desconto e 10% de comissão
 * renderia comissão sobre dinheiro que nunca entrou no caixa.
 */
export function aplicarParceiro(regra: RegraParceiro, subtotalCentavos: number): EfeitoParceiro {
  if (!regra.ativo) return { descontoCentavos: 0, comissaoCentavos: 0 };

  const descontoCentavos = Math.floor((subtotalCentavos * regra.descontoPct) / 100);
  const baseComissao = subtotalCentavos - descontoCentavos;
  const comissaoCentavos = Math.floor((baseComissao * regra.comissaoPct) / 100);

  return { descontoCentavos, comissaoCentavos };
}
