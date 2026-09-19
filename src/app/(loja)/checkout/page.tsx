import type { Metadata } from "next";
import { listarBairrosAtendidos, listarPratosVitrine } from "@/db/queries/loja";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Fechar pedido — Safran Congelados" };

export default async function CheckoutPage() {
  const [pratos, bairros] = await Promise.all([listarPratosVitrine(), listarBairrosAtendidos()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Fechar pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entrega em Maceió. O pagamento é combinado no WhatsApp depois da confirmação.
      </p>
      <CheckoutForm pratos={pratos} bairros={bairros} />
    </div>
  );
}
