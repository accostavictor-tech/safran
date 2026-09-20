/**
 * Regras de calendário e de composição da assinatura.
 *
 * Fica em lib/ para poder ser usado tanto pela tela do cliente quanto pela
 * geração de pedidos no admin, sem duplicar a aritmética de datas — duas
 * contas de "próxima entrega" divergindo é como assinatura pula ou repete
 * semana.
 */

export type Frequencia = "semanal" | "quinzenal" | "mensal";

export const FREQUENCIA_LABEL: Record<Frequencia, string> = {
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
};

const DIAS_POR_FREQUENCIA: Record<Frequencia, number> = {
  semanal: 7,
  quinzenal: 14,
  mensal: 30,
};

/**
 * Próxima data a partir de uma entrega.
 *
 * "mensal" anda 30 dias, e não um mês de calendário, de propósito: o dia da
 * semana da entrega é o que organiza a rota e a produção, e virar um mês de
 * calendário faria a entrega passear pelos dias da semana.
 */
export function proximaData(base: Date, frequencia: Frequencia): Date {
  const proxima = new Date(base);
  proxima.setDate(proxima.getDate() + DIAS_POR_FREQUENCIA[frequencia]);
  return proxima;
}

/**
 * Avança a data até ficar no futuro.
 *
 * Uma assinatura que passou semanas sem geração não deve gerar todas as
 * entregas atrasadas de uma vez: ninguém quer receber quatro kits juntos.
 * Pula os ciclos perdidos e retoma na próxima data válida.
 */
export function alinharAoFuturo(data: Date, frequencia: Frequencia, agora = new Date()): Date {
  let alvo = new Date(data);
  let voltas = 0;
  while (alvo <= agora && voltas < 400) {
    alvo = proximaData(alvo, frequencia);
    voltas++;
  }
  return alvo;
}

/** Dias que faltam para a entrega. Negativo quando já passou. */
export function diasAte(data: Date, agora = new Date()): number {
  const umDia = 24 * 60 * 60 * 1000;
  const so = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((so(data) - so(agora)) / umDia);
}

/**
 * Até quando o cliente pode trocar a composição do próximo ciclo.
 *
 * A cozinha precisa de antecedência para comprar e produzir; deixar trocar na
 * véspera transformaria a assinatura em pedido de última hora.
 */
export const ANTECEDENCIA_EDICAO_DIAS = 2;

export function podeEditarProximoCiclo(proximaEntrega: Date, agora = new Date()): boolean {
  return diasAte(proximaEntrega, agora) >= ANTECEDENCIA_EDICAO_DIAS;
}

export function composicaoEfetiva(assinatura: {
  composicaoPadrao: string[];
  composicaoProxima: string[] | null;
}): string[] {
  return assinatura.composicaoProxima ?? assinatura.composicaoPadrao;
}
