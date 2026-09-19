import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck } from "lucide-react";
import { buscarPedidoPorId, lerEndereco } from "@/db/queries/pedidos";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LimparCarrinho } from "@/components/limpar-carrinho";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { WHATSAPP_SAFRAN } from "@/lib/loja";

export const metadata: Metadata = {
  title: "Pedido confirmado — Safran Congelados",
  robots: { index: false },
};

export default async function PedidoPage({ params }: PageProps<"/pedido/[id]">) {
  const { id } = await params;
  const resultado = await buscarPedidoPorId(id);
  if (!resultado) notFound();

  const { pedido, itens } = resultado;
  const endereco = lerEndereco(pedido);
  const codigo = formatarCodigo("PED", pedido.codigo);

  const resumoWhatsapp = [
    `Olá! Acabei de fazer o pedido ${codigo} no site.`,
    "",
    ...itens.map((i) => `${i.quantidade}x ${i.nomeSnapshot}`),
    "",
    `Total: ${formatarCentavos(pedido.totalCentavos)}`,
    `Nome: ${pedido.nomeCliente}`,
  ].join("\n");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <LimparCarrinho />

      <div className="text-center">
        <CircleCheck className="mx-auto size-11 text-success" />
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Pedido registrado</h1>
        <p className="mt-1 text-muted-foreground">
          Seu código é <span className="font-mono font-semibold text-foreground">{codigo}</span>
        </p>
      </div>

      <Card className="mt-8">
        <CardContent className="pt-5">
          <ul className="space-y-1.5 text-sm">
            {itens.map((item) => (
              <li key={item.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {item.quantidade}× {item.nomeSnapshot}
                </span>
                <span className="tabular-nums text-foreground">
                  {formatarCentavos(item.precoUnitarioCentavos * item.quantidade)}
                </span>
              </li>
            ))}
          </ul>

          <Separator className="my-3" />

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums text-foreground">{formatarCentavos(pedido.subtotalCentavos)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega</dt>
              <dd className="tabular-nums text-foreground">{formatarCentavos(pedido.freteCentavos)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-medium text-foreground">Total</dt>
              <dd className="font-semibold tabular-nums text-foreground">
                {formatarCentavos(pedido.totalCentavos)}
              </dd>
            </div>
          </dl>

          {endereco ? (
            <>
              <Separator className="my-3" />
              <p className="text-sm text-muted-foreground">
                Entrega em {endereco.logradouro}, {endereco.numero}
                {endereco.complemento ? ` — ${endereco.complemento}` : ""} · {endereco.bairro}
                {endereco.referencia ? ` · ${endereco.referencia}` : ""}
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="mt-6 rounded-xl bg-primary/5 p-5 text-center">
        <p className="text-sm text-foreground">
          <strong>Falta combinar o pagamento.</strong> Mande o código no WhatsApp e a gente finaliza por lá.
        </p>
        <a
          href={`https://wa.me/${WHATSAPP_SAFRAN}?text=${encodeURIComponent(resumoWhatsapp)}`}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition hover:bg-primary/90 sm:w-auto sm:px-8"
        >
          Combinar pagamento no WhatsApp
        </a>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/" className="text-primary hover:underline">
          Voltar ao cardápio
        </Link>
      </p>
    </div>
  );
}
