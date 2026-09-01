import { notFound } from "next/navigation";
import { buscarReceitaComItens } from "@/db/queries/receitas";
import { listarInsumosParaSelecao } from "@/db/queries/insumos";
import { ReceitaForm } from "@/components/receita-form";

export default async function EditarReceitaPage({ params }: PageProps<"/receitas/[id]">) {
  const { id } = await params;
  const [dados, insumosDisponiveis] = await Promise.all([
    buscarReceitaComItens(id),
    listarInsumosParaSelecao(),
  ]);
  if (!dados) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Editar receita</h1>
      <ReceitaForm
        receita={dados.receita}
        itensIniciais={dados.itens.map((i) => ({ insumoId: i.insumoId, quantidadeLiquida: i.quantidadeLiquida }))}
        insumosDisponiveis={insumosDisponiveis}
      />
    </div>
  );
}
