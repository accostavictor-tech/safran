"use client";

import { useActionState, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, GripVertical, Wheat, Milk } from "lucide-react";
import { criarPratoAction, atualizarPratoAction, type PratoFormState } from "@/actions/pratos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  calcularPrecificacao,
  escalarMacros,
  somarMacrosLista,
  formatarMoeda,
  formatarPercentual,
  classificarSaudeMargem,
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

const BADGE_POR_STATUS = {
  prejuizo: "destructive",
  apertada: "warning",
  ok: "secondary",
  saudavel: "success",
  excelente: "success",
} as const;

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
  const saude = classificarSaudeMargem(precificacao.margemLiquidaPct);

  const itensJson = JSON.stringify(itensValidos.map((i) => ({ receitaId: i.receita.id, quantidadeG: i.quantidadeG })));

  return (
    <form action={formAction} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <input type="hidden" name="itens" value={itensJson} />

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados básicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do prato</Label>
              <Input id="nome" name="nome" required defaultValue={prato?.nome} placeholder="Ex: Marmita frango xadrez" autoFocus />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="ativo" defaultChecked={prato?.ativo ?? true} />
              Prato ativo no cardápio
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Composição (receitas)</CardTitle>
            <Button type="button" variant="secondary" size="sm" onClick={addLinha}>
              <Plus />
              Adicionar receita
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {itens.map((item) => {
                const receita = receitasPorId.get(item.receitaId);
                const qtd = Number(item.quantidadeG.replace(",", "."));
                const custoItem = receita && Number.isFinite(qtd) ? receita.custoPorGrama * qtd : 0;
                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
                    <Select value={item.receitaId} onValueChange={(v) => atualizarLinha(item.key, "receitaId", v)}>
                      <SelectTrigger className="flex-[2]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {receitasDisponiveis.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
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
                    <span className="w-4 shrink-0 text-xs text-muted-foreground">g</span>
                    <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                      {formatarMoeda(custoItem)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removerLinha(item.key)}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="Remover receita"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
              {receitasDisponiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma receita ativa cadastrada.</p>
              ) : null}
            </div>

            <div className="border-t border-border pt-3 text-sm text-muted-foreground">
              Peso total da porção: <span className="font-semibold text-foreground">{pesoTotalG.toFixed(0)} g</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precificação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="custoEmbalagem">Embalagem (R$)</Label>
                <Input
                  id="custoEmbalagem"
                  name="custoEmbalagem"
                  type="number"
                  step="0.01"
                  min="0"
                  value={custoEmbalagem}
                  onChange={(e) => setCustoEmbalagem(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="margemLucro">Margem bruta (%)</Label>
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
                <p className="text-xs text-muted-foreground">Define o preço de venda</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxaCartao">Taxa de cartão (%)</Label>
                <Input
                  id="taxaCartao"
                  name="taxaCartao"
                  type="number"
                  step="0.1"
                  min="0"
                  value={taxaCartao}
                  onChange={(e) => setTaxaCartao(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imposto">Imposto (%)</Label>
                <Input
                  id="imposto"
                  name="imposto"
                  type="number"
                  step="0.1"
                  min="0"
                  value={imposto}
                  onChange={(e) => setImposto(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comissao">Comissão (%)</Label>
                <Input
                  id="comissao"
                  name="comissao"
                  type="number"
                  step="0.1"
                  min="0"
                  value={comissao}
                  onChange={(e) => setComissao(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Marketplace, entregador, etc.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" loading={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.push("/pratos")}>
            Cancelar
          </Button>
        </div>
      </div>

      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custo de produção</dt>
                <dd className="font-medium text-foreground">{formatarMoeda(custoProducao)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">+ Embalagem</dt>
                <dd className="font-medium text-foreground">{formatarMoeda(custoEmbalagem)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Custo total</dt>
                <dd className="font-semibold text-foreground">{formatarMoeda(precificacao.custoTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Preço de venda sugerido</dt>
                <dd className="text-base font-semibold text-primary">{formatarMoeda(precificacao.precoVenda)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                <dt>Taxa de cartão</dt>
                <dd>− {formatarMoeda(precificacao.valorTaxaCartao)}</dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Imposto</dt>
                <dd>− {formatarMoeda(precificacao.valorImposto)}</dd>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Comissão</dt>
                <dd>− {formatarMoeda(precificacao.valorComissao)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <dt className="text-muted-foreground">Lucro líquido</dt>
                <dd className={precificacao.lucroLiquido < 0 ? "font-semibold text-destructive" : "font-semibold text-success"}>
                  {formatarMoeda(precificacao.lucroLiquido)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Margem líquida</dt>
                <dd>
                  <Badge variant={BADGE_POR_STATUS[saude.status]}>
                    {formatarPercentual(precificacao.margemLiquidaPct)} · {saude.label}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Tabela nutricional</CardTitle>
            <span className="text-xs text-muted-foreground">porção de {pesoTotalG.toFixed(0)} g</span>
          </CardHeader>
          <CardContent>
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
            <Separator className="my-3" />
            <div className="flex flex-wrap gap-1.5">
              {temGluten ? (
                <Badge variant="amber">
                  <Wheat className="size-3" />
                  Contém glúten
                </Badge>
              ) : null}
              {temLactose ? (
                <Badge variant="sky">
                  <Milk className="size-3" />
                  Contém lactose
                </Badge>
              ) : null}
              {!temGluten && !temLactose ? (
                <span className="text-xs text-muted-foreground">Sem glúten ou lactose nos insumos cadastrados</span>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{valor}</dd>
    </div>
  );
}
