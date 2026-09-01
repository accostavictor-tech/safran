import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { buscarInsumo } from "@/db/queries/insumos";
import { db } from "@/db";
import { insumoPrecoHistorico } from "@/db/schema";
import { InsumoForm } from "@/components/insumo-form";
import { formatarMoeda } from "@/lib/calculations";

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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Editar insumo</h1>
      <InsumoForm insumo={insumo} />

      {historico.length > 0 ? (
        <div className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-neutral-900">Histórico de preço</h2>
          <ul className="space-y-1 text-sm text-neutral-600">
            {historico.map((h) => (
              <li key={h.id} className="flex justify-between border-b border-neutral-100 py-1.5">
                <span>{new Date(h.createdAt).toLocaleDateString("pt-BR")}</span>
                <span>
                  {formatarMoeda(h.precoAnterior)} → {formatarMoeda(h.precoNovo)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
