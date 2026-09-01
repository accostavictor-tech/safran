import { notFound } from "next/navigation";
import { buscarReceitaComItens } from "@/db/queries/receitas";
import { listarInsumosParaSelecao } from "@/db/queries/insumos";
import { ReceitaForm } from "@/components/receita-form";
import { PageHeader } from "@/components/page-header";
import { formatarCodigo } from "@/lib/calculations";

export default async function EditarReceitaPage({ params }: PageProps<"/receitas/[id]">) {
  const { id } = await params;
  const [dados, insumosDisponiveis] = await Promise.all([
    buscarReceitaComItens(id),
    listarInsumosParaSelecao(),
  ]);
  if (!dados) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Editar receita"
        description={`${formatarCodigo("REC", dados.receita.codigo)} · ${dados.receita.nome}`}
      />
      <ReceitaForm
        receita={dados.receita}
        itensIniciais={dados.itens.map((i) => ({ insumoId: i.insumoId, quantidadeLiquida: i.quantidadeLiquida }))}
        insumosDisponiveis={insumosDisponiveis}
      />
    </div>
  );
}
