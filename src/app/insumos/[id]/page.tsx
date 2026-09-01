import { notFound } from "next/navigation";
import { History, TrendingDown, TrendingUp } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { buscarInsumo } from "@/db/queries/insumos";
import { db } from "@/db";
import { insumoPrecoHistorico } from "@/db/schema";
import { InsumoForm } from "@/components/insumo-form";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatarMoeda, formatarCodigo } from "@/lib/calculations";

export default async function EditarInsumoPage({ params }: PageProps<"/insumos/[id]">) {
  const { id } = await params;
  const insumo = await buscarInsumo(id);
  if (!insumo) notFound();

  const historico = await db
    .select()
    .from(insumoPrecoHistorico)
    .where(eq(insumoPrecoHistorico.insumoId, id))
    .orderBy(desc(insumoPrecoHistorico.createdAt))
    .limit(5);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Editar insumo" description={`${formatarCodigo("INS", insumo.codigo)} · ${insumo.nome}`} />
      <InsumoForm insumo={insumo} />

      {historico.length > 0 ? (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-muted-foreground" />
              Histórico de preço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {historico.map((h) => {
              const subiu = h.precoNovo > h.precoAnterior;
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-muted-foreground">{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                  <span className="flex items-center gap-1.5 text-foreground">
                    {formatarMoeda(h.precoAnterior)} → {formatarMoeda(h.precoNovo)}
                    {subiu ? (
                      <TrendingUp className="size-3.5 text-destructive" />
                    ) : (
                      <TrendingDown className="size-3.5 text-success" />
                    )}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
