import Link from "next/link";
import { listarPratosComPrecificacao } from "@/db/queries/pratos";
import { formatarMoeda, formatarPercentual } from "@/lib/calculations";
import { Card, LinkButton } from "@/components/ui";
import { ExcluirPratoButton } from "./excluir-button";

export default async function PratosPage() {
  const linhas = await listarPratosComPrecificacao();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Pratos</h1>
          <p className="text-sm text-neutral-500">{linhas.length} pratos cadastrados</p>
        </div>
        <LinkButton href="/pratos/novo">+ Novo prato</LinkButton>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Peso</th>
              <th className="px-4 py-3 font-medium">Custo total</th>
              <th className="px-4 py-3 font-medium">Preço de venda</th>
              <th className="px-4 py-3 font-medium">Margem líquida</th>
              <th className="px-4 py-3 font-medium">Kcal</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ prato, precificacao, macros, pesoTotalG }) => (
              <tr key={prato.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {prato.nome}
                  {!prato.ativo ? (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">inativo</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-neutral-700">{pesoTotalG.toFixed(0)} g</td>
                <td className="px-4 py-3 text-neutral-700">{formatarMoeda(precificacao.custoTotal)}</td>
                <td className="px-4 py-3 font-medium text-neutral-900">{formatarMoeda(precificacao.precoVenda)}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      precificacao.margemLiquidaPct < 0
                        ? "text-red-600"
                        : precificacao.margemLiquidaPct < 15
                          ? "text-amber-600"
                          : "text-green-600"
                    }
                  >
                    {formatarPercentual(precificacao.margemLiquidaPct)}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-700">{macros.energiaKcal.toFixed(0)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/pratos/${prato.id}`} className="text-sm font-medium text-purple-700 hover:underline">
                      Editar
                    </Link>
                    <ExcluirPratoButton id={prato.id} />
                  </div>
                </td>
              </tr>
            ))}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                  Nenhum prato cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
