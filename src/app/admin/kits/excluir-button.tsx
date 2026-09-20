"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirKitAction } from "@/actions/kits";

export function ExcluirKitButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Excluir este kit? Pedidos antigos continuam com o kit registrado neles.")) return;
        const dados = new FormData();
        dados.set("id", id);
        startTransition(async () => {
          await excluirKitAction(dados);
          toast.success("Kit excluído.");
        });
      }}
      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
    >
      <Trash2 className="size-3.5" />
      Excluir
    </button>
  );
}
