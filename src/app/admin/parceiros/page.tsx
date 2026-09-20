import Link from "next/link";
import { Suspense } from "react";
import { Plus, Handshake, TrendingUp, Wallet } from "lucide-react";
import { listarParceirosComResumo } from "@/db/queries/parceiros";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { TIPO_PARCEIRO_LABEL } from "@/lib/parceiros";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirParceiroButton } from "./excluir-button";

export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default async function ParceirosPage() {
  const linhas = await listarParceirosComResumo();

  const ativos = linhas.filter((l) => l.parceiro.ativo).length;
  const vendido = linhas.reduce((acc, l) => acc + l.vendidoCentavos, 0);
  const comissao = linhas.reduce((acc, l) => acc + l.comissaoCentavos, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Parceiro criado.", atualizado: "Parceiro atualizado." }} />
      </Suspense>
      <PageHeader
        title="Parceiros"
        description={`${ativos} ativo${ativos === 1 ? "" : "s"} de ${linhas.length}`}
        action={
          <Button asChild>
            <Link href="/admin/parceiros/novo">
              <Plus />
              Novo parceiro
            </Link>
          </Button>
        }
      />

      {linhas.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={Handshake} label="Parceiros ativos" value={String(ativos)} />
          <StatTile icon={TrendingUp} label="Vendido por parceiros" value={formatarCentavos(vendido)} />
          <StatTile
            icon={Wallet}
            label="Comissão acumulada"
            value={formatarCentavos(comissao)}
            tone={comissao > 0 ? "warning" : "default"}
          />
        </div>
      ) : null}

      {linhas.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Nenhum parceiro cadastrado"
          description="Empresa com tabela própria, afiliado com comissão ou nutricionista que prescreve — os três usam um código que o cliente informa no checkout."
          actionHref="/admin/parceiros/novo"
          actionLabel="Criar parceiro"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Parceiro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Condições</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Vendido</TableHead>
                <TableHead>Comissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ parceiro, pedidos, vendidoCentavos, comissaoCentavos, ultimoPedido }) => (
                <TableRow key={parceiro.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatarCodigo("PED", parceiro.codigo).replace("PED", "PAR")}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/parceiros/${parceiro.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {parceiro.nome}
                    </Link>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {parceiro.codigoIndicacao}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={parceiro.ativo ? "default" : "secondary"}>
                      {TIPO_PARCEIRO_LABEL[parceiro.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {parceiro.descontoPct > 0 ? <span className="block">{parceiro.descontoPct}% desconto</span> : null}
                    {parceiro.comissaoPct > 0 ? <span className="block">{parceiro.comissaoPct}% comissão</span> : null}
                    {parceiro.descontoPct === 0 && parceiro.comissaoPct === 0 ? "só rastreio" : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {pedidos}
                    {ultimoPedido ? (
                      <span className="block text-xs">último em {DATA.format(ultimoPedido)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {formatarCentavos(vendidoCentavos)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatarCentavos(comissaoCentavos)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/admin/parceiros/${parceiro.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        Editar
                      </Link>
                      <ExcluirParceiroButton id={parceiro.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
