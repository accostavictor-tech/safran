import Link from "next/link";
import { Suspense } from "react";
import { asc, desc } from "drizzle-orm";
import { Plus, PackagePlus } from "lucide-react";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { precoPorPratoCentavos } from "@/lib/kits";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirKitButton } from "./excluir-button";

export const dynamic = "force-dynamic";

export default async function KitsPage() {
  const lista = await db.select().from(kits).orderBy(asc(kits.ordem), desc(kits.createdAt));
  const naLoja = lista.filter((k) => k.publicado && k.ativo).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Kit criado.", atualizado: "Kit atualizado." }} />
      </Suspense>
      <PageHeader
        title="Kits"
        description={`${lista.length} kit${lista.length === 1 ? "" : "s"} · ${naLoja} na loja`}
        action={
          <Button asChild>
            <Link href="/admin/kits/novo">
              <Plus />
              Novo kit
            </Link>
          </Button>
        }
      />

      {lista.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Nenhum kit cadastrado"
          description="Um kit deixa o cliente escolher N pratos por um preço fechado — é a compra da semana inteira em um item só."
          actionHref="/admin/kits/novo"
          actionLabel="Criar kit"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Pratos</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Por prato</TableHead>
                <TableHead>Na loja</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.map((kit) => (
                <TableRow key={kit.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatarCodigo("KIT", kit.codigo)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/admin/kits/${kit.id}`} className="hover:text-primary hover:underline">
                      {kit.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">{kit.quantidadePratos}</TableCell>
                  <TableCell className="font-medium tabular-nums text-foreground">
                    {formatarCentavos(kit.precoCentavos)}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatarCentavos(precoPorPratoCentavos(kit))}
                  </TableCell>
                  <TableCell>
                    {kit.publicado && kit.ativo ? (
                      <Badge variant="success">Na loja</Badge>
                    ) : (
                      <Badge variant="secondary">{kit.ativo ? "Fora da loja" : "Inativo"}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Link href={`/admin/kits/${kit.id}`} className="text-sm font-medium text-primary hover:underline">
                        Editar
                      </Link>
                      <ExcluirKitButton id={kit.id} />
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
