"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCarrinho, totalDeUnidades } from "@/lib/carrinho-store";

export function BotaoCarrinho() {
  const estado = useCarrinho();
  const quantidadeTotal = totalDeUnidades(estado);

  return (
    <Link
      href="/carrinho"
      className="relative inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
      aria-label="Ver carrinho"
    >
      <ShoppingBag className="size-4" />
      <span className="hidden sm:inline">Carrinho</span>
      {estado.carregado && quantidadeTotal > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {quantidadeTotal}
        </span>
      ) : null}
    </Link>
  );
}
