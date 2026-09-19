import Link from "next/link";
import type { Metadata } from "next";
import { listarBairrosAtendidos, listarPratosVitrine } from "@/db/queries/loja";
import { saldoCreditoCentavos } from "@/db/queries/cupons";
import { obterSessaoCliente } from "@/lib/auth";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata: Metadata = { title: "Fechar pedido — Safran Congelados" };

export default async function CheckoutPage() {
  const [pratos, bairros, sessao] = await Promise.all([
    listarPratosVitrine(),
    listarBairrosAtendidos(),
    obterSessaoCliente(),
  ]);

  const conta = sessao
    ? {
        nome: sessao.nome,
        telefone: sessao.telefone,
        saldoCentavos: await saldoCreditoCentavos(sessao.clienteId),
      }
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Fechar pedido</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entrega em Maceió. O pagamento é combinado no WhatsApp depois da confirmação.
      </p>
      {!conta ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Já compra com a gente?{" "}
          <Link href="/entrar" className="text-primary hover:underline">
            entre na sua conta
          </Link>{" "}
          para usar seu cashback.
        </p>
      ) : null}
      <CheckoutForm pratos={pratos} bairros={bairros} conta={conta} />
    </div>
  );
}
