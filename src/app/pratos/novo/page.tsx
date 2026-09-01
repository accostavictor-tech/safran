import Link from "next/link";
import { listarReceitasParaMontagemPrato } from "@/db/queries/pratos";
import { PratoForm } from "@/components/prato-form";

export default async function NovoPratoPage() {
  const receitas = await listarReceitasParaMontagemPrato();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-xl font-semibold text-neutral-900">Novo prato</h1>
      {receitas.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Cadastre ao menos uma receita ativa antes de montar um prato.{" "}
          <Link href="/receitas/nova" className="font-medium text-purple-700 hover:underline">
            Ir para receitas
          </Link>
        </p>
      ) : (
        <PratoForm receitasDisponiveis={receitas} />
      )}
    </div>
  );
}
