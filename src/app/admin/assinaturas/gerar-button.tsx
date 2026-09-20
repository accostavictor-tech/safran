"use client";

import { useTransition } from "react";
import { PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { gerarPedidosDeAssinaturasAction } from "@/actions/assinaturas-admin";
import { Button } from "@/components/ui/button";

/**
 * Dispara a geração dos pedidos das assinaturas vencidas.
 *
 * É um botão, e não um agendador: sem cobrança automática, alguém precisa
 * olhar a lista antes de mandar os pedidos para a produção. Rodar duas vezes é
 * seguro — a unicidade (assinatura, data de entrega) barra a repetição.
 */
export function GerarPedidosButton({ pendentes }: { pendentes: number }) {
  const [rodando, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={rodando || pendentes === 0}
      onClick={() => {
        startTransition(async () => {
          const r = await gerarPedidosDeAssinaturasAction();
          if (r.gerados > 0) {
            toast.success(`${r.gerados} ${r.gerados === 1 ? "pedido gerado" : "pedidos gerados"}.`);
          }
          for (const p of r.pulados) {
            toast.warning(`ASS-${String(p.codigo).padStart(4, "0")} não gerou: ${p.motivo}.`);
          }
          if (r.gerados === 0 && r.pulados.length === 0) toast.info("Nenhuma entrega vencida.");
        });
      }}
    >
      <PlayCircle className="size-4" />
      {rodando ? "Gerando…" : `Gerar pedidos (${pendentes})`}
    </Button>
  );
}
