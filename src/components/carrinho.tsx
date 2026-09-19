"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCarrinho, definirQuantidade, remover } from "@/lib/carrinho-store";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatarCentavos } from "@/lib/calculations";
import { calcularSubtotal, faltaParaMinimo, PEDIDO_MINIMO_CENTAVOS } from "@/lib/loja";
import type { PratoVitrine } from "@/lib/vitrine";

export function Carrinho({ pratos }: { pratos: PratoVitrine[] }) {
  const { itens, carregado } = useCarrinho();
  const porId = useMemo(() => new Map(pratos.map((p) => [p.id, p])), [pratos]);

  // Preço sempre vem do catálogo do servidor, nunca do que está salvo no navegador.
  const linhas = itens
    .map((item) => {
      const prato = porId.get(item.pratoId);
      return prato ? { prato, quantidade: item.quantidade } : null;
    })
    .filter((l): l is { prato: PratoVitrine; quantidade: number } => l !== null);

  const indisponiveis = itens.length - linhas.length;
  const subtotal = calcularSubtotal(
    linhas.map((l) => ({ precoUnitarioCentavos: l.prato.precoVendaCentavos, quantidade: l.quantidade }))
  );
  const falta = faltaParaMinimo(subtotal);

  if (!carregado) {
    return <div className="mt-8 h-40 animate-pulse rounded-xl bg-muted" />;
  }

  if (linhas.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-border py-16 text-center">
        <ShoppingBag className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-3 font-medium text-foreground">Seu carrinho está vazio</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Ver o cardápio
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        {indisponiveis > 0 ? (
          <p className="rounded-lg bg-warning-soft p-3 text-sm text-on-warning-soft">
            {indisponiveis} {indisponiveis === 1 ? "item saiu" : "itens saíram"} do cardápio e{" "}
            {indisponiveis === 1 ? "foi removido" : "foram removidos"} do seu carrinho.
          </p>
        ) : null}

        {linhas.map(({ prato, quantidade }) => (
          <Card key={prato.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/prato/${prato.slug}`} className="font-medium text-foreground hover:text-primary">
                  {prato.nome}
                </Link>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatarCentavos(prato.precoVendaCentavos)} · {prato.pesoTotalG.toFixed(0)} g
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => definirQuantidade(prato.id, quantidade - 1)}
                  className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  aria-label="Diminuir quantidade"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-8 text-center text-sm font-medium tabular-nums">{quantidade}</span>
                <button
                  type="button"
                  onClick={() => definirQuantidade(prato.id, quantidade + 1)}
                  disabled={prato.estoqueLimitado && quantidade >= prato.estoqueUnidades}
                  className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <span className="w-24 text-right font-medium tabular-nums text-foreground">
                {formatarCentavos(prato.precoVendaCentavos * quantidade)}
              </span>

              <button
                type="button"
                onClick={() => remover(prato.id)}
                className="text-muted-foreground transition hover:text-destructive"
                aria-label={`Remover ${prato.nome}`}
              >
                <Trash2 className="size-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardContent className="pt-5">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums text-foreground">{formatarCentavos(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Entrega</dt>
              <dd>calculada no checkout</dd>
            </div>
          </dl>

          <Separator className="my-4" />

          {falta > 0 ? (
            <>
              <p className="text-sm text-on-warning-soft">
                Faltam <strong>{formatarCentavos(falta)}</strong> para o pedido mínimo de{" "}
                {formatarCentavos(PEDIDO_MINIMO_CENTAVOS)}.
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-lg border border-border font-medium text-foreground transition hover:border-primary/40"
              >
                Adicionar mais itens
              </Link>
            </>
          ) : (
            <Link
              href="/checkout"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Fechar pedido
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
