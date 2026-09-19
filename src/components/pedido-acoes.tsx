"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { mudarStatusPedidoAction } from "@/actions/pedidos-admin";
import { Button } from "@/components/ui/button";
import { ACAO_LABEL, TRANSICOES } from "@/lib/pedido-status";
import type { PedidoStatus } from "@/db/queries/pedidos";

export function PedidoAcoes({ pedidoId, status }: { pedidoId: string; status: PedidoStatus }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<PedidoStatus | null>(null);

  const destinos = TRANSICOES[status];
  if (destinos.length === 0) return null;

  function mover(destino: PedidoStatus) {
    if (destino === "cancelado" && !confirm("Cancelar este pedido? O estoque volta para o cardápio.")) return;
    setAlvo(destino);
    iniciar(async () => {
      const resultado = await mudarStatusPedidoAction(pedidoId, destino);
      setAlvo(null);
      if (resultado.erro) {
        toast.error(resultado.erro);
        return;
      }
      toast.success(`Pedido movido para "${ACAO_LABEL[destino] ?? destino}".`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {destinos.map((destino) => (
        <Button
          key={destino}
          type="button"
          size="sm"
          variant={destino === "cancelado" ? "ghost" : "primary"}
          loading={pendente && alvo === destino}
          disabled={pendente}
          onClick={() => mover(destino)}
          className={destino === "cancelado" ? "text-destructive hover:text-destructive" : undefined}
        >
          {ACAO_LABEL[destino] ?? destino}
        </Button>
      ))}
    </div>
  );
}
