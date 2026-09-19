import Link from "next/link";
import { Suspense } from "react";
import { Plus, UtensilsCrossed, Store, DollarSign, AlertTriangle } from "lucide-react";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import {
  formatarMoeda,
  formatarPercentual,
  classificarSaudeMargem,
  formatarCodigo,
  PISO_MARGEM_CONTRIBUICAO_PCT,
} from "@/lib/calculations";
import { PUBLICACAO_AJUDA, PUBLICACAO_LABEL, PUBLICACAO_VARIANTE } from "@/lib/publicacao";
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
  abaixo_piso: "warning",
  saudavel: "success",
  excelente: "success",
} as const;

export default async function PratosPage() {
  const linhas = await listarPratosComPrecificacao();

  // Os indicadores olham só para o que está de fato à venda: média sobre preço
  // sugerido mistura decisão com fórmula e some com o que falta publicar.
  const naLoja = linhas.filter((l) => l.publicacao.naLoja);
  const comPreco = linhas.filter((l) => l.precificacaoReal !== null);
  const precoMedio =
    comPreco.length > 0
      ? comPreco.reduce((acc, l) => acc + l.prato.precoVendaCentavos! / 100, 0) / comPreco.length
      : 0;
  const abaixoDoPiso = comPreco.filter((l) => l.precificacaoReal!.margemLiquidaPct < PISO_MARGEM_CONTRIBUICAO_PCT).length;
  const emPrejuizo = comPreco.filter((l) => l.precificacaoReal!.margemLiquidaPct < 0).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Suspense fallback={null}>
        <ToastFromQuery messages={{ criado: "Prato criado.", atualizado: "Prato atualizado." }} />
      </Suspense>
      <PageHeader
        title="Pratos"
        description={`${linhas.length} prato${linhas.length === 1 ? "" : "s"} cadastrado${linhas.length === 1 ? "" : "s"} · ${naLoja.length} no cardápio da loja`}
        action={
          <Button asChild>
            <Link href="/admin/pratos/novo">
              <Plus />
              Novo prato
            </Link>
          </Button>
        }
      />

      {linhas.length > 0 ? (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={Store}
              label="No cardápio da loja"
              value={`${naLoja.length} de ${linhas.length}`}
              tone={naLoja.length === 0 ? "warning" : "success"}
            />
            <StatTile icon={DollarSign} label="Preço médio publicado" value={comPreco.length > 0 ? formatarMoeda(precoMedio) : "—"} />
            <StatTile
              icon={AlertTriangle}
              label={`Abaixo do piso de ${PISO_MARGEM_CONTRIBUICAO_PCT}%`}
              value={String(abaixoDoPiso)}
              tone={abaixoDoPiso > 0 ? "warning" : "default"}
            />
            <StatTile
              icon={AlertTriangle}
              label="Pratos no prejuízo"
              value={String(emPrejuizo)}
              tone={emPrejuizo > 0 ? "destructive" : "default"}
            />
          </div>

          {naLoja.length === 0 ? (
            <div className="mb-5 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-on-warning-soft">
              <strong className="font-semibold">Nenhum prato está no cardápio da loja.</strong> O preço sugerido abaixo é
              só o cálculo da fórmula — para o prato aparecer na loja é preciso abrir a ficha, gravar o{" "}
              <em>preço de venda</em> e marcar <em>Publicado na loja</em>. A coluna “Na loja” mostra o que falta em cada um.
            </div>
          ) : null}
        </>
      ) : null}

      {linhas.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nenhum prato cadastrado"
          description="Monte um prato a partir das receitas já cadastradas para calcular preço de venda e margem."
          actionHref="/admin/pratos/novo"
          actionLabel="Criar prato"
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                {/* Antes do preço de propósito: é a coluna que explica por que o prato não está no cardápio. */}
                <TableHead>Na loja</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Sugerido</TableHead>
                <TableHead>Preço de venda</TableHead>
                <TableHead>Margem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ prato, precificacao, precificacaoReal, publicacao }) => {
                // A margem exibida é sempre a do preço que vale: o publicado
                // quando existe, a sugestão enquanto não existe.
                const efetiva = precificacaoReal ?? precificacao;
                const saude = classificarSaudeMargem(efetiva.margemLiquidaPct);
                return (
                  <TableRow key={prato.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatarCodigo("PRT", prato.codigo)}
                    </TableCell>
                    <TableCell className="max-w-[230px] font-medium text-foreground">
                      <Link
                        href={`/admin/pratos/${prato.id}`}
                        title={prato.nome}
                        className="block truncate hover:text-primary hover:underline"
                      >
                        {prato.nome}
                      </Link>
                      {!prato.ativo ? <Badge variant="secondary">inativo</Badge> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PUBLICACAO_VARIANTE[publicacao.status]} title={PUBLICACAO_AJUDA[publicacao.status]}>
                        {PUBLICACAO_LABEL[publicacao.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatarMoeda(precificacao.custoTotal)}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatarMoeda(precificacao.precoVenda)}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums text-foreground">
                      {prato.precoVendaCentavos !== null ? (
                        formatarMoeda(prato.precoVendaCentavos / 100)
                      ) : (
                        <span className="font-normal text-faint">a definir</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {/* Sem preço decidido, a margem é hipótese: fica neutra e
                          rotulada como tal, para não passar por margem real. */}
                      <Badge
                        variant={precificacaoReal !== null ? BADGE_POR_STATUS[saude.status] : "secondary"}
                        title={precificacaoReal !== null ? undefined : `${saude.label} — margem do preço sugerido, ainda não decidido.`}
                      >
                        {formatarPercentual(efetiva.margemLiquidaPct)} ·{" "}
                        {precificacaoReal !== null ? saude.label : "sugerido"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-3">
                        <Link href={`/admin/pratos/${prato.id}`} className="text-sm font-medium text-primary hover:underline">
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
