import Link from "next/link";
import { listarInsumosComContagem } from "@/db/queries/insumos";
import { formatarMoeda, formatarNumero } from "@/lib/calculations";
import { Card, LinkButton } from "@/components/ui";
import { ExcluirInsumoButton } from "./excluir-button";

function unidadeLabel(u: string) {
  if (u === "g") return "R$ / 100g";
  if (u === "ml") return "R$ / 100ml";
  return "R$ / unidade";
}

export default async function InsumosPage() {
  const linhas = await listarInsumosComContagem();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Insumos</h1>
          <p className="text-sm text-neutral-500">{linhas.length} insumos cadastrados</p>
        </div>
        <LinkButton href="/insumos/novo">+ Novo insumo</LinkButton>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Custo</th>
              <th className="px-4 py-3 font-medium">FC</th>
              <th className="px-4 py-3 font-medium">Restrições</th>
              <th className="px-4 py-3 font-medium">Receitas</th>
              <th className="px-4 py-3 font-medium">Atualizado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(({ insumo, receitasCount }) => (
              <tr key={insumo.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">{insumo.nome}</td>
                <td className="px-4 py-3 text-neutral-700">
                  {formatarMoeda(insumo.custo)}
                  <span className="ml-1 text-xs text-neutral-400">{unidadeLabel(insumo.unidadeMedida)}</span>
                </td>
                <td className="px-4 py-3 text-neutral-700">{formatarNumero(insumo.fatorCorrecao, 2)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {insumo.temGluten ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Glúten</span>
                    ) : null}
                    {insumo.temLactose ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Lactose</span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-700">{receitasCount}</td>
                <td className="px-4 py-3 text-neutral-500">
                  {new Date(insumo.updatedAt).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/insumos/${insumo.id}`} className="text-sm font-medium text-purple-700 hover:underline">
                      Editar
                    </Link>
                    <ExcluirInsumoButton id={insumo.id} disabled={receitasCount > 0} />
                  </div>
                </td>
              </tr>
            ))}
            {linhas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                  Nenhum insumo cadastrado ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
