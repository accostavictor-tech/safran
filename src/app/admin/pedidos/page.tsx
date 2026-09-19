import { ClipboardList, CircleDollarSign, ChefHat, Bike, MapPin, Phone, Wallet } from "lucide-react";
import { listarPedidosPainel, lerEndereco } from "@/db/queries/pedidos";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { PedidoAcoes } from "@/components/pedido-acoes";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { formatarTelefone } from "@/lib/loja";
import { STATUS_LABEL, ehFinal } from "@/lib/pedido-status";
import type { PedidoStatus } from "@/db/queries/pedidos";

// A fila é operação do dia: nunca serve conteúdo em cache.
export const dynamic = "force-dynamic";

const BADGE_POR_STATUS: Record<PedidoStatus, "secondary" | "warning" | "success" | "sky" | "destructive"> = {
  rascunho: "secondary",
  aguardando_pagamento: "warning",
  pago: "success",
  em_preparo: "sky",
  pronto: "sky",
  em_entrega: "sky",
  entregue: "secondary",
  cancelado: "destructive",
};

export default async function PedidosPage() {
  const linhas = await listarPedidosPainel();

  const contar = (status: PedidoStatus) => linhas.filter((l) => l.pedido.status === status).length;
  const aReceber = linhas
    .filter((l) => l.pedido.status === "aguardando_pagamento")
    .reduce((acc, l) => acc + l.pedido.totalCentavos, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Pedidos"
        description={`${linhas.length} pedido${linhas.length === 1 ? "" : "s"} recente${linhas.length === 1 ? "" : "s"}`}
      />

      {linhas.length > 0 ? (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            icon={CircleDollarSign}
            label="Aguardando pagamento"
            value={String(contar("aguardando_pagamento"))}
            tone={contar("aguardando_pagamento") > 0 ? "warning" : "default"}
          />
          <StatTile icon={ChefHat} label="Em preparo" value={String(contar("em_preparo"))} />
          <StatTile icon={Bike} label="Em entrega" value={String(contar("em_entrega"))} />
          <StatTile icon={CircleDollarSign} label="A receber" value={formatarCentavos(aReceber)} />
        </div>
      ) : null}

      {linhas.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum pedido ainda"
          description="Quando alguém fechar um pedido na loja, ele aparece aqui."
        />
      ) : (
        <div className="space-y-3">
          {linhas.map(({ pedido, itens, saldoCreditoCentavos }) => {
            const endereco = lerEndereco(pedido);
            return (
              <Card key={pedido.id} className={ehFinal(pedido.status) ? "opacity-70" : undefined}>
                <CardContent className="pt-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-foreground">
                          {formatarCodigo("PED", pedido.codigo)}
                        </span>
                        <Badge variant={BADGE_POR_STATUS[pedido.status]}>{STATUS_LABEL[pedido.status]}</Badge>
                      </div>
                      <p className="mt-1 font-medium text-foreground">{pedido.nomeCliente}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5" />
                        <a
                          href={`https://wa.me/${pedido.telefoneCliente}`}
                          className="hover:text-primary hover:underline"
                        >
                          {formatarTelefone(pedido.telefoneCliente)}
                        </a>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {formatarCentavos(pedido.totalCentavos)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pedido.createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  <ul className="space-y-1 text-sm">
                    {itens.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span className="text-foreground">
                          <span className="font-medium tabular-nums">{item.quantidade}×</span> {item.nomeSnapshot}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatarCentavos(item.precoUnitarioCentavos * item.quantidade)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {pedido.descontoCentavos > 0 ? (
                    <p className="mt-2 text-sm text-success">
                      Desconto de {formatarCentavos(pedido.descontoCentavos)}
                      {pedido.cupomCodigo ? ` (cupom ${pedido.cupomCodigo})` : ""}
                    </p>
                  ) : null}

                  {endereco ? (
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="size-3.5 shrink-0 translate-y-0.5" />
                      <span>
                        {endereco.logradouro}, {endereco.numero}
                        {endereco.complemento ? ` — ${endereco.complemento}` : ""} · {endereco.bairro} (
                        {endereco.zona}, frete {formatarCentavos(pedido.freteCentavos)})
                        {endereco.referencia ? ` · ${endereco.referencia}` : ""}
                      </span>
                    </p>
                  ) : null}

                  {saldoCreditoCentavos > 0 ? (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Wallet className="size-3.5" />
                      Cliente tem {formatarCentavos(saldoCreditoCentavos)} de cashback acumulado
                    </p>
                  ) : null}

                  {pedido.observacoes ? (
                    <p className="mt-2 rounded-md bg-muted/60 p-2 text-sm text-foreground">{pedido.observacoes}</p>
                  ) : null}

                  <div className="mt-4">
                    <PedidoAcoes pedidoId={pedido.id} status={pedido.status} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
