import Link from "next/link";
import { Suspense } from "react";
import { Plus, TicketPercent, CircleAlert } from "lucide-react";
import { listarCupons } from "@/db/queries/cupons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToastFromQuery } from "@/components/toast-from-query";
import { DesativarCupomButton } from "./desativar-button";
import { formatarCentavos } from "@/lib/calculations";
import { descreverCupom } from "@/lib/cupom";

export const dynamic = "force-dynamic";

export default async function CuponsPage() {
  const lista = await listarCupons();
  const ativos = lista.filter((c) => c.ativo).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Cupom criado.", atualizado: "Cupom atualizado." }} />
      </Suspense>
      <PageHeader
        title="Cupons"
        description={`${ativos} ativo${ativos === 1 ? "" : "s"} de ${lista.length}`}
        action={
          <Button asChild>
            <Link href="/admin/cupons/novo">
              <Plus />
              Novo cupom
            </Link>
          </Button>
        }
      />

      {lista.length === 0 ? (
        <EmptyState
          icon={TicketPercent}
          title="Nenhum cupom criado"
          description="Crie um código de desconto para usar em campanha, indicação ou primeira compra."
          actionHref="/admin/cupons/novo"
          actionLabel="Criar cupom"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Regras</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((cupom) => {
                const esgotado = cupom.limiteTotal !== null && cupom.usos >= cupom.limiteTotal;
                const vencido = cupom.validadeFim !== null && new Date(cupom.validadeFim) < new Date();
                return (
                  <TableRow key={cupom.id} className={cupom.ativo ? undefined : "opacity-55"}>
                    <TableCell className="font-mono text-sm font-medium text-foreground">
                      <Link href={`/admin/cupons/${cupom.id}`} className="hover:text-primary hover:underline">
                        {cupom.codigo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-foreground">{descreverCupom(cupom)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {cupom.minimoCentavos > 0 ? formatarCentavos(cupom.minimoCentavos) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cupom.validadeFim ? (
                        <span className={vencido ? "text-on-warning-soft" : undefined}>
                          {new Date(cupom.validadeFim).toLocaleDateString("pt-BR")}
                        </span>
                      ) : (
                        "sem prazo"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {cupom.usos}
                      {cupom.limiteTotal !== null ? ` / ${cupom.limiteTotal}` : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {!cupom.ativo ? <Badge variant="secondary">Inativo</Badge> : null}
                        {esgotado ? (
                          <Badge variant="warning">
                            <CircleAlert className="size-3" />
                            Esgotado
                          </Badge>
                        ) : null}
                        {cupom.primeiraCompraApenas ? <Badge variant="sky">1ª compra</Badge> : null}
                        {cupom.limitePorCliente > 1 ? (
                          <Badge variant="secondary">{cupom.limitePorCliente}× por cliente</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Link
                          href={`/admin/cupons/${cupom.id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Editar
                        </Link>
                        <DesativarCupomButton id={cupom.id} disabled={!cupom.ativo} />
                      </div>
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
