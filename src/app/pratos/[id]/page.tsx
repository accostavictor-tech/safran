import { notFound } from "next/navigation";
import { buscarPratoComItens, listarReceitasParaMontagemPrato } from "@/db/queries/pratos";
import { PratoForm } from "@/components/prato-form";

export default async function EditarPratoPage({ params }: PageProps<"/pratos/[id]">) {
  const { id } = await params;
  const [dados, receitasDisponiveis] = await Promise.all([
    buscarPratoComItens(id),
    listarReceitasParaMontagemPrato(),
  ]);
  if (!dados) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Editar prato</h1>
      <PratoForm
        prato={dados.prato}
        itensIniciais={dados.itens.map((i) => ({ receitaId: i.receitaId, quantidadeG: i.quantidadeG }))}
        receitasDisponiveis={receitasDisponiveis}
      />
    </div>
  );
}
