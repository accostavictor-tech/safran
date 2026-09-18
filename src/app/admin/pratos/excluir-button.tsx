"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirPratoAction } from "@/actions/pratos";

export function ExcluirPratoButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Excluir este prato?")) return;
        startTransition(async () => {
          await excluirPratoAction(id);
          toast.success("Prato excluído.");
        });
      }}
      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
    >
      <Trash2 className="size-3.5" />
      Excluir
    </button>
  );
}
