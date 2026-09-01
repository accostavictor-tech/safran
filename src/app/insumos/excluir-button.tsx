"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
        startTransition(async () => {
          await excluirInsumoAction(id);
          toast.success("Insumo excluído.");
        });
      }}
      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
    >
      <Trash2 className="size-3.5" />
      Excluir
    </button>
  );
}
