"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
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
        startTransition(async () => {
          await excluirReceitaAction(id);
          toast.success("Receita excluída.");
        });
      }}
      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
    >
      <Trash2 className="size-3.5" />
      Excluir
    </button>
  );
}
