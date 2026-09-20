"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { adicionarKit } from "@/lib/carrinho-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatarCentavos } from "@/lib/calculations";
import { adicionalDoPrato, precoPorPratoCentavos, resumirKit } from "@/lib/kits";
import { agruparPorCategoria, type KitVitrine, type PratoVitrine } from "@/lib/vitrine";

/**
 * Montagem de um kit: o cliente escolhe N pratos por um preço fechado.
 *
 * A escolha é por quantidade, não por marcação: repetir o mesmo prato três
 * vezes é comum em compra de congelado e proibir isso seria hostil. O contador
 * do topo é o que evita a frustração de montar 4 de 5 e só descobrir no fim.
 */
export function MontarKit({
  kit,
  pratos,
  inicial,
  acao,
}: {
  kit: KitVitrine;
  pratos: PratoVitrine[];
  /** Composição já escolhida, para editar em vez de montar do zero. */
  inicial?: string[];
  /**
   * Substitui o botão "Adicionar ao carrinho". É o que deixa a mesma montagem
   * servir para compra avulsa e para assinatura sem duplicar a tela inteira.
   */
  acao?: (info: { pratoIds: string[]; completo: boolean; totalCentavos: number }) => React.ReactNode;
}) {
  const [quantidades, setQuantidades] = useState<Record<string, number>>(() => {
    const mapa: Record<string, number> = {};
    for (const id of inicial ?? []) mapa[id] = (mapa[id] ?? 0) + 1;
    return mapa;
  });
  const router = useRouter();

  const porId = useMemo(() => new Map(pratos.map((p) => [p.id, p])), [pratos]);
  const precoFaixa = precoPorPratoCentavos(kit);

  const escolhidosIds = useMemo(
    () =>
      Object.entries(quantidades).flatMap(([id, q]) => Array.from({ length: q }, () => id)),
    [quantidades]
  );
  const escolhidos = escolhidosIds
    .map((id) => porId.get(id))
    .filter((p): p is PratoVitrine => p !== undefined);

  const resumo = resumirKit(kit, escolhidos);
  const total = escolhidos.length;

  function ajustar(pratoId: string, delta: number) {
    setQuantidades((atual) => {
      const novo = (atual[pratoId] ?? 0) + delta;
      if (novo <= 0) {
        const resto = { ...atual };
        delete resto[pratoId];
        return resto;
      }
      return { ...atual, [pratoId]: novo };
    });
  }

  function adicionarAoCarrinho() {
    adicionarKit(kit.id, escolhidosIds);
    router.push("/carrinho");
  }

  const grupos = agruparPorCategoria(pratos);

  return (
    <>
      {/* Barra de progresso fixa: o contador precisa estar visível enquanto rola a lista. */}
      <div className="sticky top-16 z-10 -mx-4 mt-6 border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {total} de {kit.quantidadePratos} {kit.quantidadePratos === 1 ? "prato" : "pratos"}
            </p>
            <p className="text-xs text-muted-foreground">
              {resumo.completo
                ? "Kit completo"
                : `Escolha mais ${resumo.faltam} ${resumo.faltam === 1 ? "prato" : "pratos"}`}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display text-[20px] font-bold leading-7 tabular-nums text-primary">
                {formatarCentavos(resumo.totalCentavos)}
              </p>
              {resumo.adicionaisCentavos > 0 ? (
                <p className="text-xs text-muted-foreground">
                  inclui {formatarCentavos(resumo.adicionaisCentavos)} de adicional
                </p>
              ) : null}
            </div>
            {acao ? (
              acao({ pratoIds: escolhidosIds, completo: resumo.completo, totalCentavos: resumo.totalCentavos })
            ) : (
              <Button type="button" onClick={adicionarAoCarrinho} disabled={!resumo.completo}>
                <ShoppingBag className="size-4" />
                Adicionar
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (total / kit.quantidadePratos) * 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {grupos.map((grupo) => (
          <section key={grupo.categoria}>
            {grupos.length > 1 ? (
              <h2 className="mb-3 font-display text-[20px] font-semibold leading-7 text-foreground">
                {grupo.categoria}
              </h2>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {grupo.pratos.map((prato) => {
                const quantidade = quantidades[prato.id] ?? 0;
                const adicional = adicionalDoPrato(kit, prato);
                const cheio = total >= kit.quantidadePratos;
                return (
                  <Card key={prato.id} className={quantidade > 0 ? "border-primary/50" : undefined}>
                    <CardContent className="flex items-center gap-3 py-3.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{prato.nome}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {prato.pesoTotalG.toFixed(0)} g · {prato.macros.energiaKcal.toFixed(0)} kcal ·{" "}
                          {prato.macros.proteinas.toFixed(0)} g proteína
                        </p>
                        {adicional > 0 ? (
                          <Badge variant="amber" className="mt-1.5">
                            + {formatarCentavos(adicional)}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => ajustar(prato.id, -1)}
                          disabled={quantidade === 0}
                          className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Tirar ${prato.nome} do kit`}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">{quantidade}</span>
                        <button
                          type="button"
                          onClick={() => ajustar(prato.id, 1)}
                          disabled={cheio || (prato.estoqueLimitado && quantidade >= prato.estoqueUnidades)}
                          className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Pôr ${prato.nome} no kit`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Cada prato do kit vale {formatarCentavos(precoFaixa)}. Pratos acima disso entram com a diferença como
        adicional, mostrada no card.
      </p>

      {resumo.completo && !acao ? (
        <div className="sticky bottom-4 mt-6 sm:hidden">
          <Button type="button" onClick={adicionarAoCarrinho} className="w-full shadow-elevation-2">
            <Check className="size-4" />
            Adicionar {formatarCentavos(resumo.totalCentavos)}
          </Button>
        </div>
      ) : null}
    </>
  );
}
