"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarPratoAction, atualizarPratoAction, type PratoFormState } from "@/actions/pratos";
import { Field, Input, Select, Button, Card } from "@/components/ui";
import {
  calcularPrecificacao,
  escalarMacros,
  somarMacrosLista,
  formatarMoeda,
  formatarPercentual,
  MACRO_ZERO,
} from "@/lib/calculations";
import type { pratos } from "@/db/schema";
import type { ReceitaParaMontagem } from "@/db/queries/pratos";

type Prato = typeof pratos.$inferSelect;

interface ItemLinha {
  key: string;
  receitaId: string;
  quantidadeG: string;
}

const initialState: PratoFormState = {};

export function PratoForm({
  prato,
  itensIniciais,
  receitasDisponiveis,
}: {
  prato?: Prato;
  itensIniciais?: { receitaId: string; quantidadeG: number }[];
  receitasDisponiveis: ReceitaParaMontagem[];
}) {
  const router = useRouter();
  const action = prato ? atualizarPratoAction.bind(null, prato.id) : criarPratoAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [itens, setItens] = useState<ItemLinha[]>(
    itensIniciais && itensIniciais.length > 0
      ? itensIniciais.map((i, idx) => ({
          key: `${idx}-${i.receitaId}`,
          receitaId: i.receitaId,
          quantidadeG: String(i.quantidadeG),
        }))
      : [{ key: "novo-0", receitaId: receitasDisponiveis[0]?.id ?? "", quantidadeG: "" }]
  );

  const [custoEmbalagem, setCustoEmbalagem] = useState(prato?.custoEmbalagem ?? 0);
  const [margemLucro, setMargemLucro] = useState(prato?.margemLucro ?? 45);
  const [taxaCartao, setTaxaCartao] = useState(prato?.taxaCartao ?? 0);
  const [imposto, setImposto] = useState(prato?.imposto ?? 0);
  const [comissao, setComissao] = useState(prato?.comissao ?? 0);

  const receitasPorId = useMemo(() => new Map(receitasDisponiveis.map((r) => [r.id, r])), [receitasDisponiveis]);

  function addLinha() {
    setItens((prev) => [
      ...prev,
      { key: `novo-${Date.now()}`, receitaId: receitasDisponiveis[0]?.id ?? "", quantidadeG: "" },
    ]);
  }
  function removerLinha(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }
  function atualizarLinha(key: string, campo: "receitaId" | "quantidadeG", valor: string) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [campo]: valor } : i)));
  }

  const itensValidos = itens
    .map((item) => {
      const receita = receitasPorId.get(item.receitaId);
      const qtd = Number(item.quantidadeG.replace(",", "."));
      if (!receita || !Number.isFinite(qtd) || qtd <= 0) return null;
      return { receita, quantidadeG: qtd };
    })
    .filter((x): x is { receita: ReceitaParaMontagem; quantidadeG: number } => x !== null);

  const custoProducao = itensValidos.reduce((acc, i) => acc + i.receita.custoPorGrama * i.quantidadeG, 0);
  const precificacao = calcularPrecificacao({
    custoProducao,
    custoEmbalagem,
    margemLucro,
    taxaCartao,
    imposto,
    comissao,
  });
  const macros = somarMacrosLista(
    itensValidos.length > 0
      ? itensValidos.map((i) => escalarMacros(i.receita.macrosPor100g, 100, i.quantidadeG))
      : [MACRO_ZERO]
  );
  const pesoTotalG = itensValidos.reduce((acc, i) => acc + i.quantidadeG, 0);
  const temGluten = itensValidos.some((i) => i.receita.temGluten);
  const temLactose = itensValidos.some((i) => i.receita.temLactose);

  const itensJson = JSON.stringify(itensValidos.map((i) => ({ receitaId: i.receita.id, quantidadeG: i.quantidadeG })));

  return (
    <form action={formAction} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <input type="hidden" name="itens" value={itensJson} />

      <div className="space-y-6 lg:col-span-2">
        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Dados básicos</h2>
          <Field label="Nome do prato" htmlFor="nome">
            <Input id="nome" name="nome" required defaultValue={prato?.nome} placeholder="Ex: Marmita frango xadrez" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="ativo" defaultChecked={prato?.ativo ?? true} className="h-4 w-4 rounded border-neutral-300" />
            Prato ativo no cardápio
          </label>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Composição (receitas)</h2>
            <Button type="button" variant="secondary" onClick={addLinha}>
              + Adicionar receita
            </Button>
          </div>

          <div className="space-y-2">
            {itens.map((item) => {
              const receita = receitasPorId.get(item.receitaId);
              const qtd = Number(item.quantidadeG.replace(",", "."));
              const custoItem = receita && Number.isFinite(qtd) ? receita.custoPorGrama * qtd : 0;
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <Select
                    value={item.receitaId}
                    onChange={(e) => atualizarLinha(item.key, "receitaId", e.target.value)}
                    className="flex-[2]"
                  >
                    {receitasDisponiveis.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nome}
                      </option>
                    ))}
                  </Select>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Qtd. (g)"
                    value={item.quantidadeG}
                    onChange={(e) => atualizarLinha(item.key, "quantidadeG", e.target.value)}
                    className="w-24"
                  />
                  <span className="w-6 text-xs text-neutral-400">g</span>
                  <span className="w-24 shrink-0 text-right text-sm text-neutral-600">{formatarMoeda(custoItem)}</span>
                  <button
                    type="button"
                    onClick={() => removerLinha(item.key)}
                    className="shrink-0 px-2 text-sm text-red-500 hover:text-red-700"
                    aria-label="Remover receita"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
            {receitasDisponiveis.length === 0 ? (
              <p className="text-sm text-neutral-400">Nenhuma receita ativa cadastrada.</p>
            ) : null}
          </div>

          <div className="border-t border-neutral-100 pt-3 text-sm text-neutral-600">
            Peso total da porção: <span className="font-semibold text-neutral-900">{pesoTotalG.toFixed(0)} g</span>
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Precificação</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Embalagem (R$)" htmlFor="custoEmbalagem">
              <Input
                id="custoEmbalagem"
                name="custoEmbalagem"
                type="number"
                step="0.01"
                min="0"
                value={custoEmbalagem}
                onChange={(e) => setCustoEmbalagem(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Margem bruta (%)" htmlFor="margemLucro" hint="Define o preço de venda">
              <Input
                id="margemLucro"
                name="margemLucro"
                type="number"
                step="0.1"
                min="0"
                max="99.99"
                value={margemLucro}
                onChange={(e) => setMargemLucro(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Taxa de cartão (%)" htmlFor="taxaCartao">
              <Input
                id="taxaCartao"
                name="taxaCartao"
                type="number"
                step="0.1"
                min="0"
                value={taxaCartao}
                onChange={(e) => setTaxaCartao(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Imposto (%)" htmlFor="imposto">
              <Input
                id="imposto"
                name="imposto"
                type="number"
                step="0.1"
                min="0"
                value={imposto}
                onChange={(e) => setImposto(Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Comissão (%)" htmlFor="comissao" hint="Marketplace, entregador, etc.">
              <Input
                id="comissao"
                name="comissao"
                type="number"
                step="0.1"
                min="0"
                value={comissao}
                onChange={(e) => setComissao(Number(e.target.value) || 0)}
              />
            </Field>
          </div>
        </Card>

        {state.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/pratos")}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="space-y-3 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Resumo</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">Custo de produção</dt>
              <dd className="font-medium text-neutral-900">{formatarMoeda(custoProducao)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">+ Embalagem</dt>
              <dd className="font-medium text-neutral-900">{formatarMoeda(custoEmbalagem)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2">
              <dt className="text-neutral-500">Custo total</dt>
              <dd className="font-semibold text-neutral-900">{formatarMoeda(precificacao.custoTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Preço de venda sugerido</dt>
              <dd className="text-base font-semibold text-purple-800">{formatarMoeda(precificacao.precoVenda)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2 text-xs text-neutral-500">
              <dt>Taxa de cartão</dt>
              <dd>− {formatarMoeda(precificacao.valorTaxaCartao)}</dd>
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <dt>Imposto</dt>
              <dd>− {formatarMoeda(precificacao.valorImposto)}</dd>
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <dt>Comissão</dt>
              <dd>− {formatarMoeda(precificacao.valorComissao)}</dd>
            </div>
            <div className="flex justify-between border-t border-neutral-100 pt-2">
              <dt className="text-neutral-500">Lucro líquido</dt>
              <dd
                className={`font-semibold ${precificacao.lucroLiquido < 0 ? "text-red-600" : "text-green-600"}`}
              >
                {formatarMoeda(precificacao.lucroLiquido)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Margem líquida</dt>
              <dd
                className={`font-semibold ${
                  precificacao.margemLiquidaPct < 0
                    ? "text-red-600"
                    : precificacao.margemLiquidaPct < 15
                      ? "text-amber-600"
                      : "text-green-600"
                }`}
              >
                {formatarPercentual(precificacao.margemLiquidaPct)}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Tabela nutricional</h2>
            <span className="text-xs text-neutral-400">porção de {pesoTotalG.toFixed(0)} g</span>
          </div>
          <dl className="space-y-1.5 text-sm">
            <Linha label="Valor energético" valor={`${macros.energiaKcal.toFixed(0)} kcal`} />
            <Linha label="Carboidratos" valor={`${macros.carboidratos.toFixed(1)} g`} />
            <Linha label="Açúcares totais" valor={`${macros.acucaresTotais.toFixed(1)} g`} />
            <Linha label="Proteínas" valor={`${macros.proteinas.toFixed(1)} g`} />
            <Linha label="Gorduras totais" valor={`${macros.gordurasTotais.toFixed(1)} g`} />
            <Linha label="Gorduras saturadas" valor={`${macros.gordurasSaturadas.toFixed(1)} g`} />
            <Linha label="Gorduras trans" valor={`${macros.gordurasTrans.toFixed(1)} g`} />
            <Linha label="Fibra alimentar" valor={`${macros.fibraAlimentar.toFixed(1)} g`} />
            <Linha label="Sódio" valor={`${macros.sodio.toFixed(0)} mg`} />
          </dl>
          <div className="flex gap-1.5 border-t border-neutral-100 pt-3">
            {temGluten ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Contém glúten</span> : null}
            {temLactose ? <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-700">Contém lactose</span> : null}
            {!temGluten && !temLactose ? <span className="text-xs text-neutral-400">Sem glúten ou lactose nos insumos cadastrados</span> : null}
          </div>
        </Card>
      </div>
    </form>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-900">{valor}</dd>
    </div>
  );
}
