"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, GripVertical } from "lucide-react";
import { criarReceitaAction, atualizarReceitaAction, type ReceitaFormState } from "@/actions/receitas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { calcularCustoItem, calcularCMV, formatarMoeda, formatarCodigo, somarMacros, escalarMacros } from "@/lib/calculations";
import type { receitas } from "@/db/schema";

type Receita = typeof receitas.$inferSelect;

export interface InsumoParaReceita {
  id: string;
  codigo: number;
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
  return u === "un" ? "un" : u;
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
    <form action={formAction} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <input type="hidden" name="itens" value={itensJson} />

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-3">
                <Label htmlFor="nome">Nome da receita</Label>
                <Input id="nome" name="nome" required defaultValue={receita?.nome} placeholder="Ex: Frango xadrez" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rendimentoTotalG">Rendimento total (g)</Label>
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
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pesoPorcaoG">Peso da porção (g)</Label>
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
              </div>
              <label className="flex items-center gap-2 pt-6 text-sm text-foreground">
                <Checkbox name="ativa" defaultChecked={receita?.ativa ?? true} />
                Receita ativa
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Insumos</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={addLinha}>
              <Plus />
              Adicionar insumo
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {itens.map((item) => {
                const insumo = insumosPorId.get(item.insumoId);
                const qtd = Number(item.quantidadeLiquida.replace(",", "."));
                const custoItem = insumo && Number.isFinite(qtd) ? calcularCustoItem(qtd, insumo) : 0;
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
                    <Select value={item.insumoId} onValueChange={(v) => atualizarLinha(item.key, "insumoId", v)}>
                      <SelectTrigger className="flex-[2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {insumosDisponiveis.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            <span className="font-mono text-xs text-muted-foreground">{formatarCodigo("INS", i.codigo)}</span>{" "}
                            {i.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
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
                    <span className="w-6 shrink-0 text-xs text-muted-foreground">{insumo ? unidadeLabel(insumo.unidadeMedida) : ""}</span>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {formatarMoeda(custoItem)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removerLinha(item.key)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remover insumo"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
              {itens.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum insumo adicionado.</p> : null}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
              <div>
                <span className="text-muted-foreground">Custo total: </span>
                <span className="font-semibold text-foreground">{formatarMoeda(custoTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">CMV (R$/g): </span>
                <span className="font-semibold text-foreground">{formatarMoeda(cmv)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Custo por porção: </span>
                <span className="font-semibold text-foreground">{formatarMoeda(custoPorcao)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Kcal por porção: </span>
                <span className="font-semibold text-foreground">{macrosPorcao.energiaKcal.toFixed(0)} kcal</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modo de preparo</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              id="modoPreparo"
              name="modoPreparo"
              rows={6}
              defaultValue={receita?.modoPreparo ?? ""}
              placeholder="Descreva o passo a passo do preparo..."
            />
          </CardContent>
        </Card>

        {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" loading={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/receitas")}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo total</dt>
                <dd className="font-medium text-foreground">{formatarMoeda(custoTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">CMV</dt>
                <dd className="font-medium text-foreground">{formatarMoeda(cmv)} / g</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Custo por porção</dt>
                <dd className="text-base font-semibold text-primary">{formatarMoeda(custoPorcao)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
