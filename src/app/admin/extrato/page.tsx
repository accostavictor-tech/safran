import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Landmark, Scale, Wallet } from "lucide-react";
import { listarConexoesComContas, listarMovimentacoesDoMes } from "@/db/queries/extrato";
import { formatarCentavos } from "@/lib/calculations";
import {
  deslocarMes,
  formatarDocumento,
  mesAtual,
  mesValido,
  rotuloMes,
  statusConexao,
  TIPO_CONTA_LABEL,
} from "@/lib/extrato";
import { eTransferenciaInterna } from "@/lib/pluggy/movimentacoes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { cn } from "@/lib/utils";
import { SincronizarButton } from "./sincronizar-button";
import { ConectarBancoForm } from "./conectar-form";
import { ConectarBancoButton } from "./conectar-banco";

export const dynamic = "force-dynamic";
// As actions desta página rodam o sync, que chama a Pluggy conta por conta.
export const maxDuration = 60;

// `data` é só a data (YYYY-MM-DD), lida como UTC para não voltar um dia.
const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
const DATA_HORA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Maceio",
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Alternativa ao widget: banco já autorizado pelo Meu Pluggy. */
function ViaMeuPluggy() {
  return (
    <details>
      <summary className="cursor-pointer text-sm text-muted-foreground">
        Já conectou pelo Meu Pluggy? Cole o ID do item
      </summary>
      <div className="mt-3">
        <ConectarBancoForm />
      </div>
    </details>
  );
}

function hrefExtrato(mes: string, conta?: string) {
  const params = new URLSearchParams({ mes });
  if (conta) params.set("conta", conta);
  return `/admin/extrato?${params}`;
}

export default async function ExtratoPage({ searchParams }: PageProps<"/admin/extrato">) {
  const { mes: mesParam, conta: contaParam } = await searchParams;
  const hoje = mesAtual();
  const mes = typeof mesParam === "string" && mesValido(mesParam) ? mesParam : hoje;
  const contaId = typeof contaParam === "string" && UUID.test(contaParam) ? contaParam : undefined;

  const conexoes = await listarConexoesComContas();

  if (conexoes.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <PageHeader title="Extrato bancário" description="Movimentações dos bancos da Safran, via Pluggy (Open Finance)" />
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Conectar o primeiro banco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Escolha o banco e autorize pelo Open Finance, com o login de quem acessa a conta da empresa. As contas e
              o extrato são puxados na hora, e depois todo dia pelo sync automático.
            </p>
            <ConectarBancoButton />
            <ViaMeuPluggy />
          </CardContent>
        </Card>
      </div>
    );
  }

  const linhas = await listarMovimentacoesDoMes(mes, contaId);
  const contas = conexoes.flatMap((c) => c.contas);

  const saldoEmConta = contas.filter((c) => c.tipo === "BANK").reduce((acc, c) => acc + c.saldoCentavos, 0);
  // Caixa = contas, sem cartão (no cartão o dinheiro só sai quando a fatura é
  // paga, e o pagamento já aparece na conta) e sem transferência entre contas
  // da própria Safran, que entraria duas vezes.
  const doCaixa = linhas.filter((l) => l.contaTipo === "BANK" && !eTransferenciaInterna(l.contraparteDocumento));
  const entradas = doCaixa.filter((l) => l.valorCentavos > 0).reduce((acc, l) => acc + l.valorCentavos, 0);
  const saidas = doCaixa.filter((l) => l.valorCentavos < 0).reduce((acc, l) => acc + l.valorCentavos, 0);
  const resultado = entradas + saidas;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Extrato bancário"
        description="Movimentações dos bancos da Safran, via Pluggy (Open Finance)"
        action={<SincronizarButton />}
      />

      <Card className="mb-5 gap-0 py-0">
        {conexoes.map((conexao) => {
          const st = statusConexao(conexao.status);
          return (
            <div key={conexao.id} className="space-y-3 border-b border-border px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Landmark className="size-4 text-muted-foreground" />
                  <p className="font-medium text-foreground">{conexao.instituicao ?? "Banco"}</p>
                  <Badge variant={st.tom}>{st.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {conexao.dadosAtualizadosEm
                    ? `Banco consultado em ${DATA_HORA.format(conexao.dadosAtualizadosEm)}`
                    : "Banco ainda não consultado"}
                  {conexao.ultimoSyncEm ? ` · sync em ${DATA_HORA.format(conexao.ultimoSyncEm)}` : null}
                </p>
              </div>

              {st.acao ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-on-warning-soft">{st.acao}</p>
                  {st.reconectar ? <ConectarBancoButton itemId={conexao.providerItemId} variant="secondary" /> : null}
                </div>
              ) : null}
              {conexao.ultimoSyncOk === false ? (
                <p className="text-sm text-destructive">Último sync falhou: {conexao.ultimoSyncDetalhe}</p>
              ) : null}

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {conexao.contas.map((conta) => (
                  <li key={conta.id} className="rounded-lg border border-border px-3 py-2">
                    <p className="truncate text-sm font-medium text-foreground">{conta.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {TIPO_CONTA_LABEL[conta.subtipo ?? ""] ?? conta.subtipo ?? conta.tipo}
                      {conta.numero ? ` · ${conta.numero}` : null}
                    </p>
                    <p className="mt-1 text-sm tabular-nums text-foreground">
                      {conta.tipo === "CREDIT" ? "Fatura aberta " : "Saldo "}
                      {formatarCentavos(conta.saldoCentavos)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-5 py-3">
          <ConectarBancoButton variant="secondary" />
          <ViaMeuPluggy />
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Wallet} label="Saldo em conta" value={formatarCentavos(saldoEmConta)} hint="hoje, sem cartão" />
        <StatTile icon={ArrowDownLeft} label="Entradas no mês" value={formatarCentavos(entradas)} tone="success" />
        <StatTile icon={ArrowUpRight} label="Saídas no mês" value={formatarCentavos(-saidas)} />
        <StatTile
          icon={Scale}
          label="Resultado de caixa"
          value={formatarCentavos(resultado)}
          tone={resultado < 0 ? "destructive" : "default"}
          hint="sem transferências internas"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={hrefExtrato(deslocarMes(mes, -1), contaId)}
            aria-label="Mês anterior"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <p className="min-w-40 text-center text-sm font-medium text-foreground">{rotuloMes(mes)}</p>
          {mes < hoje ? (
            <Link
              href={hrefExtrato(deslocarMes(mes, 1), contaId)}
              aria-label="Próximo mês"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="p-1.5 text-muted-foreground/30">
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>

        {contas.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {[{ id: undefined, nome: "Todas" }, ...contas].map((c) => (
              <Link
                key={c.id ?? "todas"}
                href={hrefExtrato(mes, c.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  c.id === contaId
                    ? "border-primary bg-primary-soft text-on-primary-soft"
                    : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {c.nome}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      {linhas.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma movimentação neste mês"
          description="Se o banco foi conectado agora, o histórico disponível no Open Finance já foi puxado — confira os meses anteriores."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Contraparte</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const interna = eTransferenciaInterna(l.contraparteDocumento);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {DATA.format(new Date(`${l.data}T00:00:00Z`))}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{l.descricao}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {l.meio ? <Badge variant="secondary">{l.meio}</Badge> : null}
                        {interna ? <Badge variant="sky">Entre contas</Badge> : null}
                        {l.categoriaPluggy ? (
                          <span className="text-xs text-muted-foreground">{l.categoriaPluggy}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {l.contraparte ?? "—"}
                      {l.contraparteDocumento ? (
                        <span className="block font-mono text-xs">{formatarDocumento(l.contraparteDocumento)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{l.contaNome}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        l.valorCentavos > 0 ? "text-on-success-soft" : "text-foreground"
                      )}
                    >
                      {formatarCentavos(l.valorCentavos)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
