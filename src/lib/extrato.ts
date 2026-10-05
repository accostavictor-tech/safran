/** Regras de exibição do extrato bancário — sem I/O, usadas pela tela. */

const FUSO = "America/Maceio";

/** Mês corrente no fuso de Maceió, no formato YYYY-MM. */
export function mesAtual(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit" }).format(agora);
}

export function mesValido(mes: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes);
}

export function deslocarMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(ano, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Intervalo [inicio, fim) em datas YYYY-MM-DD, para filtrar a coluna `data`. */
export function intervaloDoMes(mes: string): { inicio: string; fim: string } {
  return { inicio: `${mes}-01`, fim: `${deslocarMes(mes, 1)}-01` };
}

export function rotuloMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  const nome = new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(ano, m - 1, 1))
  );
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)} de ${ano}`;
}

/** CPF/CNPJ formatado; máscara do banco (com "*") passa como veio. */
export function formatarDocumento(doc: string | null): string | null {
  if (!doc) return null;
  if (/^\d{11}$/.test(doc)) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (/^\d{14}$/.test(doc)) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}

type Tom = "success" | "warning" | "destructive" | "sky" | "secondary";

/**
 * Status do item na Pluggy. É o estado da conexão com o banco, não do nosso
 * sync: um sync pode dar certo e ainda assim trazer dado velho, se o
 * consentimento expirou.
 */
export function statusConexao(status: string | null): {
  label: string;
  tom: Tom;
  acao?: string;
  reconectar?: boolean;
} {
  switch (status) {
    case "UPDATED":
      return { label: "Conectado", tom: "success" };
    case "UPDATING":
    case "MERGING":
      return { label: "Atualizando", tom: "sky" };
    case "OUTDATED":
      return {
        label: "Desatualizado",
        tom: "warning",
        acao: "O banco não respondeu na última atualização. Se persistir, reconecte.",
        reconectar: true,
      };
    case "LOGIN_ERROR":
    case "WAITING_USER_INPUT":
    case "WAITING_USER_ACTION":
      return {
        label: "Reconectar",
        tom: "destructive",
        acao: "O consentimento expirou ou foi revogado. Reconecte para o extrato voltar a atualizar.",
        reconectar: true,
      };
    case "DELETED":
      return {
        label: "Removida",
        tom: "secondary",
        acao: "Conexão apagada na Pluggy. O histórico continua aqui; para voltar a atualizar, conecte de novo.",
      };
    default:
      return { label: status ?? "Sem status", tom: "secondary" };
  }
}

export const TIPO_CONTA_LABEL: Record<string, string> = {
  CHECKING_ACCOUNT: "Conta corrente",
  SAVINGS_ACCOUNT: "Poupança",
  CREDIT_CARD: "Cartão de crédito",
};
