import Link from "next/link";
import { listarInsumosParaSelecao } from "@/db/queries/insumos";
import { ReceitaForm } from "@/components/receita-form";

export default async function NovaReceitaPage() {
  const insumos = await listarInsumosParaSelecao();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Nova receita</h1>
      {insumos.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Cadastre ao menos um insumo antes de criar uma receita.{" "}
          <Link href="/insumos/novo" className="font-medium text-purple-700 hover:underline">
            Ir para insumos
          </Link>
        </p>
      ) : (
        <ReceitaForm insumosDisponiveis={insumos} />
      )}
    </div>
  );
}
