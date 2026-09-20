"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Calculator, Check, Info, ShoppingBag, TriangleAlert } from "lucide-react";
import { adicionar } from "@/lib/carrinho-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { formatarCentavos } from "@/lib/calculations";
import {
  ATIVIDADE_LABEL,
  OBJETIVO_LABEL,
  estimarMetas,
  metasPorRefeicao,
  montarSelecao,
  ranquear,
  somarSelecao,
  TOLERANCIA_KCAL,
  type Atividade,
  type Objetivo,
  type Sexo,
} from "@/lib/dieta";
import type { PratoVitrine } from "@/lib/vitrine";

type Modo = "metas" | "estimar";

const ATIVIDADES: Atividade[] = ["sedentario", "leve", "moderado", "intenso", "muito_intenso"];
const OBJETIVOS: Objetivo[] = ["perder", "manter", "ganhar"];

export function CalculadoraDieta({ pratos }: { pratos: PratoVitrine[] }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("metas");

  // Caminho 1: metas que vieram da nutricionista.
  const [kcalDia, setKcalDia] = useState("2000");
  const [proteinaDia, setProteinaDia] = useState("120");
  const [refeicoesDia, setRefeicoesDia] = useState("4");

  // Caminho 2: estimativa.
  const [sexo, setSexo] = useState<Sexo>("feminino");
  const [idade, setIdade] = useState("35");
  const [pesoKg, setPesoKg] = useState("70");
  const [alturaCm, setAlturaCm] = useState("165");
  const [atividade, setAtividade] = useState<Atividade>("moderado");
  const [objetivo, setObjetivo] = useState<Objetivo>("manter");

  const [semGluten, setSemGluten] = useState(false);
  const [semLactose, setSemLactose] = useState(false);
  const [quantidade, setQuantidade] = useState("10");

  const numero = (v: string, padrao: number) => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : padrao;
  };

  const diarias = useMemo(() => {
    if (modo === "metas") {
      return { kcal: numero(kcalDia, 2000), proteinaG: numero(proteinaDia, 120) };
    }
    return estimarMetas({
      sexo,
      idade: numero(idade, 35),
      pesoKg: numero(pesoKg, 70),
      alturaCm: numero(alturaCm, 165),
      atividade,
      objetivo,
    });
  }, [modo, kcalDia, proteinaDia, sexo, idade, pesoKg, alturaCm, atividade, objetivo]);

  // Memoizados para que o ranqueamento só recalcule quando a meta ou a
  // restrição mudar de verdade, e não a cada tecla digitada em outro campo.
  const porRefeicao = useMemo(() => metasPorRefeicao(diarias, numero(refeicoesDia, 4)), [diarias, refeicoesDia]);
  const restricoes = useMemo(() => ({ semGluten, semLactose }), [semGluten, semLactose]);
  const ranqueados = useMemo(() => ranquear(pratos, porRefeicao, restricoes), [pratos, porRefeicao, restricoes]);

  const cabem = ranqueados.filter((r) => r.dentroDaFaixaCalorica);
  const quantosPratos = Math.max(1, Math.min(30, Math.round(numero(quantidade, 10))));
  const selecao = montarSelecao(cabem.length > 0 ? cabem : ranqueados, quantosPratos);
  const total = somarSelecao(selecao);

  function adicionarSelecaoAoCarrinho() {
    const contagem = new Map<string, number>();
    for (const p of selecao) contagem.set(p.id, (contagem.get(p.id) ?? 0) + 1);
    for (const [pratoId, qtd] of contagem) adicionar(pratoId, qtd);
    router.push("/carrinho");
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModo("metas")}
            aria-pressed={modo === "metas"}
            className={
              modo === "metas"
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
            }
          >
            Já tenho minhas metas
          </button>
          <button
            type="button"
            onClick={() => setModo("estimar")}
            aria-pressed={modo === "estimar"}
            className={
              modo === "estimar"
                ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
            }
          >
            Calcular uma estimativa
          </button>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
            {modo === "metas" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Copie os números da ficha que a sua nutricionista passou.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="kcalDia">Calorias por dia</Label>
                    <Input
                      id="kcalDia"
                      inputMode="numeric"
                      value={kcalDia}
                      onChange={(e) => setKcalDia(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="proteinaDia">Proteína por dia (g)</Label>
                    <Input
                      id="proteinaDia"
                      inputMode="numeric"
                      value={proteinaDia}
                      onChange={(e) => setProteinaDia(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="refeicoesDia">Refeições por dia</Label>
                    <Input
                      id="refeicoesDia"
                      inputMode="numeric"
                      value={refeicoesDia}
                      onChange={(e) => setRefeicoesDia(e.target.value)}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  {(["feminino", "masculino"] as Sexo[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSexo(s)}
                      aria-pressed={sexo === s}
                      className={
                        sexo === s
                          ? "rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-foreground ring-2 ring-primary"
                          : "rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-primary/40"
                      }
                    >
                      {s === "feminino" ? "Feminino" : "Masculino"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="idade">Idade</Label>
                    <Input id="idade" inputMode="numeric" value={idade} onChange={(e) => setIdade(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pesoKg">Peso (kg)</Label>
                    <Input id="pesoKg" inputMode="decimal" value={pesoKg} onChange={(e) => setPesoKg(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="alturaCm">Altura (cm)</Label>
                    <Input
                      id="alturaCm"
                      inputMode="numeric"
                      value={alturaCm}
                      onChange={(e) => setAlturaCm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="refeicoesDia2">Refeições/dia</Label>
                    <Input
                      id="refeicoesDia2"
                      inputMode="numeric"
                      value={refeicoesDia}
                      onChange={(e) => setRefeicoesDia(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="atividade">Nível de atividade</Label>
                  <select
                    id="atividade"
                    value={atividade}
                    onChange={(e) => setAtividade(e.target.value as Atividade)}
                    className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground"
                  >
                    {ATIVIDADES.map((a) => (
                      <option key={a} value={a}>
                        {ATIVIDADE_LABEL[a]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {OBJETIVOS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setObjetivo(o)}
                      aria-pressed={objetivo === o}
                      className={
                        objetivo === o
                          ? "rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-foreground ring-2 ring-primary"
                          : "rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-primary/40"
                      }
                    >
                      {OBJETIVO_LABEL[o]}
                    </button>
                  ))}
                </div>

                <p className="flex items-start gap-2 rounded-lg bg-warning-soft p-3 text-xs leading-5 text-on-warning-soft">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Isto é uma <strong>estimativa</strong> pela fórmula de Mifflin-St Jeor, para você ter um ponto de
                    partida. Não substitui avaliação de nutricionista, e não serve para quem tem condição de saúde
                    que exija dieta prescrita.
                  </span>
                </p>
              </>
            )}

            <div className="flex flex-wrap gap-4 border-t border-border pt-4">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={semGluten} onCheckedChange={(v) => setSemGluten(v === true)} />
                Sem glúten
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox checked={semLactose} onCheckedChange={(v) => setSemLactose(v === true)} />
                Sem lactose
              </label>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="font-display text-[22px] font-semibold leading-7 text-foreground">
            Pratos que cabem na sua refeição
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Alvo de {porRefeicao.kcal} kcal e {porRefeicao.proteinaG} g de proteína por refeição, com tolerância de{" "}
            {Math.round(TOLERANCIA_KCAL * 100)}%.
          </p>

          {ranqueados.length === 0 ? (
            <p className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Nenhum prato do cardápio atende a essas restrições no momento.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {ranqueados.slice(0, 12).map(({ prato, pontuacao, kcalDiferenca, atendeProteina, dentroDaFaixaCalorica }) => (
                <div
                  key={prato.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link href={`/prato/${prato.slug}`} className="font-medium text-foreground hover:text-primary">
                      {prato.nome}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {prato.macros.energiaKcal.toFixed(0)} kcal · {prato.macros.proteinas.toFixed(0)} g proteína ·{" "}
                      {formatarCentavos(prato.precoVendaCentavos)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Badge variant={dentroDaFaixaCalorica ? "success" : "secondary"}>
                      {kcalDiferenca === 0
                        ? "na meta"
                        : `${kcalDiferenca > 0 ? "+" : ""}${kcalDiferenca} kcal`}
                    </Badge>
                    {atendeProteina ? <Badge variant="success">proteína ok</Badge> : null}
                    <span className="text-xs tabular-nums text-faint">{pontuacao}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardContent className="space-y-4 pt-5">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calculator className="size-4" />
              Suas metas
            </p>
            <p className="mt-1 font-display text-[28px] font-bold leading-9 tabular-nums text-primary">
              {diarias.kcal} <span className="text-base font-normal text-muted-foreground">kcal/dia</span>
            </p>
            <p className="text-sm text-muted-foreground">{diarias.proteinaG} g de proteína por dia</p>
          </div>

          <div className="border-t border-border pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantas refeições quer da Safran</Label>
              <Input
                id="quantidade"
                inputMode="numeric"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
              />
            </div>

            {selecao.length > 0 ? (
              <>
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Calorias do plano</dt>
                    <dd className="tabular-nums text-foreground">{total.kcal.toFixed(0)} kcal</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Proteína do plano</dt>
                    <dd className="tabular-nums text-foreground">{total.proteinaG.toFixed(0)} g</dd>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1.5">
                    <dt className="font-medium text-foreground">Total</dt>
                    <dd className="font-semibold tabular-nums text-foreground">
                      {formatarCentavos(total.precoCentavos)}
                    </dd>
                  </div>
                </dl>

                <Button type="button" onClick={adicionarSelecaoAoCarrinho} className="mt-4 w-full">
                  <ShoppingBag className="size-4" />
                  Pôr no carrinho
                </Button>
                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                  Variamos os pratos enquanto houver opção compatível, para a semana não ficar repetitiva.
                </p>
              </>
            ) : null}
          </div>

          <p className="flex items-start gap-1.5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Os valores nutricionais vêm das fichas técnicas dos nossos pratos e são calculados a partir dos
            ingredientes. Trate-os como referência.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
