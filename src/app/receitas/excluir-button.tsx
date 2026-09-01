"use client";

import { useTransition } from "react";
import { excluirReceitaAction } from "@/actions/receitas";

export function ExcluirReceitaButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pending}
      title={disabled ? "Receita em uso em pratos — remova dos pratos antes de excluir." : undefined}
      onClick={() => {
        if (!confirm("Excluir esta receita?")) return;
        startTransition(() => excluirReceitaAction(id));
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-neutral-300 disabled:no-underline"
    >
      Excluir
    </button>
  );
}
