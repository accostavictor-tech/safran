"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { criarReceitaAction, atualizarReceitaAction, type ReceitaFormState } from "@/actions/receitas";
import { Field, Input, Select, Textarea, Button, Card } from "@/components/ui";
import { calcularCustoItem, calcularCMV, formatarMoeda, somarMacros, escalarMacros } from "@/lib/calculations";
import type { receitas } from "@/db/schema";

type Receita = typeof receitas.$inferSelect;

export interface InsumoParaReceita {
  id: string;
  nome: string;
  unidadeMedida: "g" | "ml" | "un";
  custo: number;
  fatorCorrecao: number;
  temGluten: boolean;
  temLactose: boolean;
  energiaKcal: number | null;
  carboidratos: number | null;
  acucaresTotais: number | null;
  proteinas: number | null;
  gordurasTotais: number | null;
  gordurasSaturadas: number | null;
  gordurasTrans: number | null;
  fibraAlimentar: number | null;
  sodio: number | null;
}

interface ItemLinha {
  key: string;
  insumoId: string;
  quantidadeLiquida: string;
}

const initialState: ReceitaFormState = {};

function unidadeLabel(u: string) {
  if (u === "un") return "un";
  return u;
}

export function ReceitaForm({
  receita,
  itensIniciais,
  insumosDisponiveis,
}: {
  receita?: Receita;
  itensIniciais?: { insumoId: string; quantidadeLiquida: number }[];
  insumosDisponiveis: InsumoParaReceita[];
}) {
  const router = useRouter();
  const action = receita ? atualizarReceitaAction.bind(null, receita.id) : criarReceitaAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  const [itens, setItens] = useState<ItemLinha[]>(
    itensIniciais && itensIniciais.length > 0
      ? itensIniciais.map((i, idx) => ({
          key: `${idx}-${i.insumoId}`,
          insumoId: i.insumoId,
          quantidadeLiquida: String(i.quantidadeLiquida),
        }))
      : [{ key: "novo-0", insumoId: insumosDisponiveis[0]?.id ?? "", quantidadeLiquida: "" }]
  );
  const [rendimentoTotalG, setRendimentoTotalG] = useState(receita?.rendimentoTotalG ?? 0);
  const [pesoPorcaoG, setPesoPorcaoG] = useState(receita?.pesoPorcaoG ?? 0);

  const insumosPorId = useMemo(() => new Map(insumosDisponiveis.map((i) => [i.id, i])), [insumosDisponiveis]);

  function addLinha() {
    setItens((prev) => [
      ...prev,
      { key: `novo-${Date.now()}`, insumoId: insumosDisponiveis[0]?.id ?? "", quantidadeLiquida: "" },
    ]);
  }

  function removerLinha(key: string) {
    setItens((prev) => prev.filter((i) => i.key !== key));
  }

  function atualizarLinha(key: string, campo: "insumoId" | "quantidadeLiquida", valor: string) {
    setItens((prev) => prev.map((i) => (i.key === key ? { ...i, [campo]: valor } : i)));
  }

  const custoTotal = itens.reduce((acc, item) => {
    const insumo = insumosPorId.get(item.insumoId);
    const qtd = Number(item.quantidadeLiquida.replace(",", "."));
    if (!insumo || !Number.isFinite(qtd)) return acc;
    return acc + calcularCustoItem(qtd, insumo);
  }, 0);
  const cmv = calcularCMV(custoTotal, rendimentoTotalG);
  const custoPorcao = cmv * pesoPorcaoG;

  const macrosTotal = somarMacros(
    itens
      .map((item) => {
        const insumo = insumosPorId.get(item.insumoId);
        const qtd = Number(item.quantidadeLiquida.replace(",", "."));
        if (!insumo || !Number.isFinite(qtd)) return null;
        return { quantidadeLiquida: qtd, macros: insumo };
      })
      .filter((x): x is { quantidadeLiquida: number; macros: InsumoParaReceita } => x !== null)
  );
  const macrosPorcao = escalarMacros(macrosTotal, rendimentoTotalG, pesoPorcaoG);

  const itensJson = JSON.stringify(
    itens
      .filter((i) => i.insumoId && i.quantidadeLiquida)
      .map((i) => ({ insumoId: i.insumoId, quantidadeLiquida: Number(i.quantidadeLiquida.replace(",", ".")) }))
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="itens" value={itensJson} />

      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Dados básicos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <Field label="Nome da receita" htmlFor="nome">
              <Input id="nome" name="nome" required defaultValue={receita?.nome} placeholder="Ex: Frango xadrez" />
            </Field>
          </div>
          <Field label="Rendimento total (g)" htmlFor="rendimentoTotalG">
            <Input
              id="rendimentoTotalG"
              name="rendimentoTotalG"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={receita?.rendimentoTotalG}
              onChange={(e) => setRendimentoTotalG(Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Peso da porção (g)" htmlFor="pesoPorcaoG">
            <Input
              id="pesoPorcaoG"
              name="pesoPorcaoG"
              type="number"
              step="0.01"
              min="0.01"
              required
              defaultValue={receita?.pesoPorcaoG}
              onChange={(e) => setPesoPorcaoG(Number(e.target.value) || 0)}
            />
          </Field>
          <label className="flex items-center gap-2 pt-6 text-sm text-neutral-700">
            <input type="checkbox" name="ativa" defaultChecked={receita?.ativa ?? true} className="h-4 w-4 rounded border-neutral-300" />
            Receita ativa
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Insumos</h2>
          <Button type="button" variant="secondary" onClick={addLinha}>
            + Adicionar insumo
          </Button>
        </div>

        <div className="space-y-2">
          {itens.map((item) => {
            const insumo = insumosPorId.get(item.insumoId);
            const qtd = Number(item.quantidadeLiquida.replace(",", "."));
            const custoItem = insumo && Number.isFinite(qtd) ? calcularCustoItem(qtd, insumo) : 0;
            return (
              <div key={item.key} className="flex items-center gap-2">
                <Select
                  value={item.insumoId}
                  onChange={(e) => atualizarLinha(item.key, "insumoId", e.target.value)}
                  className="flex-[2]"
                >
                  {insumosDisponiveis.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.nome}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Qtd."
                  value={item.quantidadeLiquida}
                  onChange={(e) => atualizarLinha(item.key, "quantidadeLiquida", e.target.value)}
                  className="w-24"
                />
                <span className="w-8 text-xs text-neutral-400">{insumo ? unidadeLabel(insumo.unidadeMedida) : ""}</span>
                <span className="w-24 shrink-0 text-right text-sm text-neutral-600">{formatarMoeda(custoItem)}</span>
                <button
                  type="button"
                  onClick={() => removerLinha(item.key)}
                  className="shrink-0 px-2 text-sm text-red-500 hover:text-red-700"
                  aria-label="Remover insumo"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {itens.length === 0 ? <p className="text-sm text-neutral-400">Nenhum insumo adicionado.</p> : null}
        </div>

        <div className="flex flex-wrap gap-6 border-t border-neutral-100 pt-4 text-sm">
          <div>
            <span className="text-neutral-500">Custo total: </span>
            <span className="font-semibold text-neutral-900">{formatarMoeda(custoTotal)}</span>
          </div>
          <div>
            <span className="text-neutral-500">CMV (R$/g): </span>
            <span className="font-semibold text-neutral-900">{formatarMoeda(cmv)}</span>
          </div>
          <div>
            <span className="text-neutral-500">Custo por porção: </span>
            <span className="font-semibold text-neutral-900">{formatarMoeda(custoPorcao)}</span>
          </div>
          <div>
            <span className="text-neutral-500">Kcal por porção: </span>
            <span className="font-semibold text-neutral-900">{macrosPorcao.energiaKcal.toFixed(0)} kcal</span>
          </div>
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Modo de preparo</h2>
        <Textarea id="modoPreparo" name="modoPreparo" rows={6} defaultValue={receita?.modoPreparo ?? ""} placeholder="Descreva o passo a passo do preparo..." />
      </Card>

      {state.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/receitas")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
