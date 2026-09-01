import Link from "next/link";
import { Suspense } from "react";
import { Plus, Package, Wheat, Milk } from "lucide-react";
import { listarInsumosComContagem } from "@/db/queries/insumos";
import { formatarMoeda, formatarNumero } from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirInsumoButton } from "./excluir-button";

function unidadeLabel(u: string) {
  if (u === "g") return "/ 100g";
  if (u === "ml") return "/ 100ml";
  return "/ un";
}

export default async function InsumosPage() {
  const linhas = await listarInsumosComContagem();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Insumo criado.", atualizado: "Insumo atualizado." }} />
      </Suspense>
      <PageHeader
        title="Insumos"
        description={`${linhas.length} insumo${linhas.length === 1 ? "" : "s"} cadastrado${linhas.length === 1 ? "" : "s"}`}
        action={
          <Button asChild>
            <Link href="/insumos/novo">
              <Plus />
              Novo insumo
            </Link>
          </Button>
        }
      />

      {linhas.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum insumo cadastrado"
          description="Cadastre os insumos que vocês compram — depois é só montar as receitas com eles."
          actionHref="/insumos/novo"
          actionLabel="Cadastrar insumo"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>FC</TableHead>
                <TableHead>Restrições</TableHead>
                <TableHead>Em receitas</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ insumo, receitasCount }) => (
                <TableRow key={insumo.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/insumos/${insumo.id}`} className="hover:text-primary hover:underline">
                      {insumo.nome}
                    </Link>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {formatarMoeda(insumo.custo)}
                    <span className="ml-1 text-xs text-muted-foreground">{unidadeLabel(insumo.unidadeMedida)}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatarNumero(insumo.fatorCorrecao, 2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {insumo.temGluten ? (
                        <Badge variant="amber">
                          <Wheat className="size-3" />
                          Glúten
                        </Badge>
                      ) : null}
                      {insumo.temLactose ? (
                        <Badge variant="sky">
                          <Milk className="size-3" />
                          Lactose
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{receitasCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(insumo.updatedAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Link href={`/insumos/${insumo.id}`} className="text-sm font-medium text-primary hover:underline">
                        Editar
                      </Link>
                      <ExcluirInsumoButton id={insumo.id} disabled={receitasCount > 0} />
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
