import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { parceiros } from "@/db/schema";
import { pedidosDoParceiro } from "@/db/queries/parceiros";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { TIPO_PARCEIRO_LABEL } from "@/lib/parceiros";
import { STATUS_LABEL } from "@/lib/pedido-status";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { ParceiroForm } from "@/components/parceiro-form";

export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default async function EditarParceiroPage({ params }: PageProps<"/admin/parceiros/[id]">) {
  const { id } = await params;
  const [parceiro] = await db.select().from(parceiros).where(eq(parceiros.id, id)).limit(1);
  if (!parceiro) notFound();

  const pedidos = await pedidosDoParceiro(parceiro.id);
  const comissaoAberta = pedidos
    .filter((p) => p.status !== "cancelado")
    .reduce((acc, p) => acc + p.comissaoCentavos, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title={parceiro.nome}
        description={`${TIPO_PARCEIRO_LABEL[parceiro.tipo]} · ${parceiro.codigoIndicacao}`}
      />
      <ParceiroForm parceiro={parceiro} />

      <h2 className="mt-10 font-display text-[22px] font-semibold leading-7 text-foreground">
        Pedidos por este parceiro
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Comissão acumulada (sem contar cancelados):{" "}
        <strong className="text-foreground">{formatarCentavos(comissaoAberta)}</strong>
      </p>

      {pedidos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido com este código ainda.</p>
      ) : (
        <Card className="mt-3 overflow-hidden py-0">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href="/admin/pedidos" className="text-primary hover:underline">
                      {formatarCodigo("PED", pedido.codigo)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{DATA.format(pedido.createdAt)}</TableCell>
                  <TableCell className="text-foreground">{pedido.nomeCliente}</TableCell>
                  <TableCell>
                    <Badge variant={pedido.status === "cancelado" ? "secondary" : "success"}>
                      {STATUS_LABEL[pedido.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatarCentavos(pedido.totalCentavos)}
                  </TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {formatarCentavos(pedido.comissaoCentavos)}
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
