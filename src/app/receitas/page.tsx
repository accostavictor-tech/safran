import Link from "next/link";
import { listarReceitasComCusto } from "@/db/queries/receitas";
import { formatarMoeda } from "@/lib/calculations";
import { Card, LinkButton } from "@/components/ui";
import { ExcluirReceitaButton } from "./excluir-button";

export default async function ReceitasPage() {
  const linhas = await listarReceitasComCusto();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Receitas</h1>
          <p className="text-sm text-neutral-500">{linhas.length} fichas técnicas cadastradas</p>
        </div>
        <LinkButton href="/receitas/nova">+ Nova receita</LinkButton>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Rendimento</th>
              <th className="px-4 py-3 font-medium">Porção</th>
              <th className="px-4 py-3 font-medium">Custo total</th>
              <th className="px-4 py-3 font-medium">CMV (R$/g)</th>
              <th className="px-4 py-3 font-medium">Custo/porção</th>
              <th className="px-4 py-3 font-medium">Usada em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ receita, custoTotal, cmv, custoPorcao, pratosCount }) => (
              <tr key={receita.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {receita.nome}
                  {!receita.ativa ? (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">inativa</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-700">{receita.rendimentoTotalG} g</td>
                <td className="px-4 py-3 text-neutral-700">{receita.pesoPorcaoG} g</td>
                <td className="px-4 py-3 text-neutral-700">{formatarMoeda(custoTotal)}</td>
                <td className="px-4 py-3 text-neutral-700">{formatarMoeda(cmv)}</td>
                <td className="px-4 py-3 text-neutral-700">{formatarMoeda(custoPorcao)}</td>
                <td className="px-4 py-3 text-neutral-700">{pratosCount} prato(s)</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/receitas/${receita.id}`} className="text-sm font-medium text-purple-700 hover:underline">
                      Editar
                    </Link>
                    <ExcluirReceitaButton id={receita.id} disabled={pratosCount > 0} />
                  </div>
                </td>
              </tr>
            ))}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-neutral-400">
                  Nenhuma receita cadastrada ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
