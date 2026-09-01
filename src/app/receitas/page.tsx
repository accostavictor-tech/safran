import Link from "next/link";
import { Suspense } from "react";
import { Plus, NotebookText } from "lucide-react";
import { listarReceitasComCusto } from "@/db/queries/receitas";
import { formatarMoeda } from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirReceitaButton } from "./excluir-button";

export default async function ReceitasPage() {
  const linhas = await listarReceitasComCusto();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Receita criada.", atualizado: "Receita atualizada." }} />
      </Suspense>
      <PageHeader
        title="Receitas"
        description={`${linhas.length} ficha${linhas.length === 1 ? "" : "s"} técnica${linhas.length === 1 ? "" : "s"} cadastrada${linhas.length === 1 ? "" : "s"}`}
        action={
          <Button asChild>
            <Link href="/receitas/nova">
              <Plus />
              Nova receita
            </Link>
          </Button>
        }
      />

      {linhas.length === 0 ? (
        <EmptyState
          icon={NotebookText}
          title="Nenhuma receita cadastrada"
          description="Monte a ficha técnica de uma receita a partir dos insumos já cadastrados."
          actionHref="/receitas/nova"
          actionLabel="Criar receita"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Rendimento</TableHead>
                <TableHead>Porção</TableHead>
                <TableHead>Custo total</TableHead>
                <TableHead>CMV (R$/g)</TableHead>
                <TableHead>Custo/porção</TableHead>
                <TableHead>Usada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ receita, custoTotal, cmv, custoPorcao, pratosCount }) => (
                <TableRow key={receita.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link href={`/receitas/${receita.id}`} className="hover:text-primary hover:underline">
                      {receita.nome}
                    </Link>
                    {!receita.ativa ? (
                      <Badge variant="secondary" className="ml-2">
                        inativa
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{receita.rendimentoTotalG} g</TableCell>
                  <TableCell className="text-muted-foreground">{receita.pesoPorcaoG} g</TableCell>
                  <TableCell className="text-foreground">{formatarMoeda(custoTotal)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatarMoeda(cmv)}</TableCell>
                  <TableCell className="font-medium text-foreground">{formatarMoeda(custoPorcao)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pratosCount} prato{pratosCount === 1 ? "" : "s"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-3">
                      <Link href={`/receitas/${receita.id}`} className="text-sm font-medium text-primary hover:underline">
                        Editar
                      </Link>
                      <ExcluirReceitaButton id={receita.id} disabled={pratosCount > 0} />
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
