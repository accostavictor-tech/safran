import Link from "next/link";
import { Suspense } from "react";
import { Plus, Package, Wheat, Milk, CheckCircle2, CircleAlert } from "lucide-react";
import { listarInsumosComContagem } from "@/db/queries/insumos";
import { formatarMoeda, formatarNumero, formatarCodigo } from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirInsumoButton } from "./excluir-button";

function unidadeLabel(u: string) {
  if (u === "g") return "/ 100g";
  if (u === "ml") return "/ 100ml";
  return "/ un";
}

export default async function InsumosPage() {
  const linhas = await listarInsumosComContagem();
  const revisados = linhas.filter(({ insumo }) => insumo.macroRevisadoEm).length;
  const semRevisao = linhas.length - revisados;

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

      {linhas.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <StatTile icon={CheckCircle2} label="Macros revisados" value={String(revisados)} tone="success" />
          <StatTile
            icon={CircleAlert}
            label="Ainda sem revisão"
            value={String(semRevisao)}
            tone={semRevisao > 0 ? "warning" : "default"}
          />
        </div>
      ) : null}

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
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>FC</TableHead>
                <TableHead>Restrições</TableHead>
                <TableHead>Macros</TableHead>
                <TableHead>Em receitas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ insumo, receitasCount }) => (
                <TableRow key={insumo.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatarCodigo("INS", insumo.codigo)}
                  </TableCell>
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
                  <TableCell>
                    {insumo.macroRevisadoEm ? (
                      <Badge variant="success">
                        <CheckCircle2 className="size-3" />
                        {new Date(insumo.macroRevisadoEm).toLocaleDateString("pt-BR")}
                      </Badge>
                    ) : (
                      <Badge variant="warning">
                        <CircleAlert className="size-3" />
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{receitasCount}</TableCell>
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
