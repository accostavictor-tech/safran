"use client";

import { useTransition } from "react";
import { excluirInsumoAction } from "@/actions/insumos";

export function ExcluirInsumoButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={disabled ? "Insumo em uso em receitas — remova das receitas antes de excluir." : undefined}
      onClick={() => {
        if (!confirm("Excluir este insumo?")) return;
        startTransition(() => excluirInsumoAction(id));
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
    >
      Excluir
    </button>
  );
}
