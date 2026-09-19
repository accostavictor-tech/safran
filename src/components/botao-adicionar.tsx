"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { adicionar } from "@/lib/carrinho-store";

export function BotaoAdicionar({
  pratoId,
  nome,
  className,
}: {
  pratoId: string;
  nome: string;
  className?: string;
}) {
  const [adicionado, setAdicionado] = useState(false);

  function clicar() {
    adicionar(pratoId);
    setAdicionado(true);
    setTimeout(() => setAdicionado(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={clicar}
      aria-label={`Adicionar ${nome} ao carrinho`}
      className={
        className ??
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-medium text-primary-foreground transition hover:bg-primary/90"
      }
    >
      {adicionado ? (
        <>
          <Check className="size-4" />
          Adicionado
        </>
      ) : (
        <>
          <Plus className="size-4" />
          Adicionar ao carrinho
        </>
      )}
    </button>
  );
}
