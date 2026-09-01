import Link from "next/link";
import { listarInsumosParaSelecao } from "@/db/queries/insumos";
import { ReceitaForm } from "@/components/receita-form";
import { PageHeader } from "@/components/page-header";

export default async function NovaReceitaPage() {
  const insumos = await listarInsumosParaSelecao();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Nova receita" />
      {insumos.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre ao menos um insumo antes de criar uma receita.{" "}
          <Link href="/insumos/novo" className="font-medium text-primary hover:underline">
            Ir para insumos
          </Link>
        </p>
      ) : (
        <ReceitaForm insumosDisponiveis={insumos} />
      )}
    </div>
  );
}
