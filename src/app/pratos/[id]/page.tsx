import { notFound } from "next/navigation";
import { buscarPratoComItens, listarReceitasParaMontagemPrato } from "@/db/queries/pratos";
import { PratoForm } from "@/components/prato-form";
import { PageHeader } from "@/components/page-header";
import { formatarCodigo } from "@/lib/calculations";

export default async function EditarPratoPage({ params }: PageProps<"/pratos/[id]">) {
  const { id } = await params;
  const [dados, receitasDisponiveis] = await Promise.all([
    buscarPratoComItens(id),
    listarReceitasParaMontagemPrato(),
  ]);
  if (!dados) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Editar prato"
        description={`${formatarCodigo("PRT", dados.prato.codigo)} · ${dados.prato.nome}`}
      />
      <PratoForm
        prato={dados.prato}
        itensIniciais={dados.itens.map((i) => ({ receitaId: i.receitaId, quantidadeG: i.quantidadeG }))}
        receitasDisponiveis={receitasDisponiveis}
      />
    </div>
  );
}
