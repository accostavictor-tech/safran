"use client";

import { useTransition } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { desativarCupomAction } from "@/actions/cupons-admin";

export function DesativarCupomButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={disabled || pendente}
      title={disabled ? "Cupom já está inativo." : "Desativar cupom"}
      onClick={() => {
        if (!confirm("Desativar este cupom? Ele deixa de valer no checkout.")) return;
        iniciar(async () => {
          await desativarCupomAction(id);
          toast.success("Cupom desativado.");
        });
      }}
      className="inline-flex items-center gap-1 text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
    >
      <Ban className="size-3.5" />
      Desativar
    </button>
  );
}
