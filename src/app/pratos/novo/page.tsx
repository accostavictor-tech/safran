import Link from "next/link";
import { listarReceitasParaMontagemPrato } from "@/db/queries/pratos";
import { PratoForm } from "@/components/prato-form";
import { PageHeader } from "@/components/page-header";

export default async function NovoPratoPage() {
  const receitas = await listarReceitasParaMontagemPrato();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Novo prato" />
      {receitas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre ao menos uma receita ativa antes de montar um prato.{" "}
          <Link href="/receitas/nova" className="font-medium text-primary hover:underline">
            Ir para receitas
          </Link>
        </p>
      ) : (
        <PratoForm receitasDisponiveis={receitas} />
      )}
    </div>
  );
}
