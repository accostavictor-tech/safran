"use client";

import { useTransition } from "react";
import { excluirPratoAction } from "@/actions/pratos";

export function ExcluirPratoButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Excluir este prato?")) return;
        startTransition(() => excluirPratoAction(id));
      }}
      className="text-sm font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-neutral-300"
    >
      Excluir
    </button>
  );
}
