import Link from "next/link";
import { Suspense } from "react";
import { Plus, UtensilsCrossed, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import { formatarMoeda, formatarPercentual, classificarSaudeMargem, formatarCodigo } from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { ToastFromQuery } from "@/components/toast-from-query";
import { ExcluirPratoButton } from "./excluir-button";

const BADGE_POR_STATUS = {
  prejuizo: "destructive",
  apertada: "warning",
  ok: "secondary",
  saudavel: "success",
  excelente: "success",
} as const;

export default async function PratosPage() {
  const linhas = await listarPratosComPrecificacao();

  const comPreco = linhas.filter((l) => l.precificacao.precoVenda > 0);
  const margemMedia =
    comPreco.length > 0 ? comPreco.reduce((acc, l) => acc + l.precificacao.margemLiquidaPct, 0) / comPreco.length : 0;
  const emPrejuizo = linhas.filter((l) => l.precificacao.margemLiquidaPct < 0).length;
  const precoMedio = comPreco.length > 0 ? comPreco.reduce((acc, l) => acc + l.precificacao.precoVenda, 0) / comPreco.length : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Prato criado.", atualizado: "Prato atualizado." }} />
      </Suspense>
      <PageHeader
        title="Pratos"
        description={`${linhas.length} prato${linhas.length === 1 ? "" : "s"} cadastrado${linhas.length === 1 ? "" : "s"}`}
        action={
          <Button asChild>
            <Link href="/pratos/novo">
              <Plus />
              Novo prato
            </Link>
          </Button>
        }
      />

      {linhas.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={DollarSign} label="Preço médio de venda" value={formatarMoeda(precoMedio)} />
          <StatTile
            icon={TrendingUp}
            label="Margem líquida média"
            value={formatarPercentual(margemMedia)}
            tone={margemMedia < 15 ? "warning" : "success"}
          />
          <StatTile
            icon={AlertTriangle}
            label="Pratos no prejuízo"
            value={String(emPrejuizo)}
            tone={emPrejuizo > 0 ? "destructive" : "default"}
          />
        </div>
      ) : null}

      {linhas.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhum prato cadastrado"
          description="Monte um prato a partir das receitas já cadastradas para calcular preço de venda e margem."
          actionHref="/pratos/novo"
          actionLabel="Criar prato"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[880px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Custo total</TableHead>
                <TableHead>Preço de venda</TableHead>
                <TableHead>Margem líquida</TableHead>
                <TableHead>Kcal</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ prato, precificacao, macros, pesoTotalG }) => {
                const saude = classificarSaudeMargem(precificacao.margemLiquidaPct);
                return (
                  <TableRow key={prato.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatarCodigo("PRT", prato.codigo)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/pratos/${prato.id}`} className="hover:text-primary hover:underline">
                        {prato.nome}
                      </Link>
                      {!prato.ativo ? (
                        <Badge variant="secondary" className="ml-2">
                          inativo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{pesoTotalG.toFixed(0)} g</TableCell>
                    <TableCell className="text-muted-foreground">{formatarMoeda(precificacao.custoTotal)}</TableCell>
                    <TableCell className="font-medium text-foreground">{formatarMoeda(precificacao.precoVenda)}</TableCell>
                    <TableCell>
                      <Badge variant={BADGE_POR_STATUS[saude.status]}>
                        {formatarPercentual(precificacao.margemLiquidaPct)} · {saude.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{macros.energiaKcal.toFixed(0)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Link href={`/pratos/${prato.id}`} className="text-sm font-medium text-primary hover:underline">
                          Editar
                        </Link>
                        <ExcluirPratoButton id={prato.id} />
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
