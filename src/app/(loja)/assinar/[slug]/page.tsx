import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { buscarKitVitrinePorSlug, listarPratosVitrine } from "@/db/queries/loja";
import { listarEnderecos } from "@/db/queries/conta";
import { obterSessaoCliente } from "@/lib/auth";
import { formatarCentavos } from "@/lib/calculations";
import { AssinarForm } from "@/components/assinar-form";

export const metadata: Metadata = { title: "Assinar — Safran Congelados", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AssinarPage({ params }: PageProps<"/assinar/[slug]">) {
  const { slug } = await params;
  const sessao = await obterSessaoCliente();
  // A assinatura é da conta, não do navegador: sem sessão não há onde prendê-la.
  if (!sessao) redirect(`/entrar?destino=/assinar/${slug}`);

  const [kit, pratos, enderecosDoCliente] = await Promise.all([
    buscarKitVitrinePorSlug(slug),
    listarPratosVitrine(),
    listarEnderecos(sessao.clienteId),
  ]);
  if (!kit) notFound();

  const opcoes = enderecosDoCliente.map((e) => ({
    id: e.id,
    logradouro: e.logradouro,
    numero: e.numero,
    complemento: e.complemento,
    bairro: e.bairro,
    padrao: e.padrao,
    atendido: e.zonaNome !== null,
  }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href={`/kit/${kit.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao kit
      </Link>

      <h1 className="mt-5 font-display text-[28px] font-semibold leading-9 text-foreground sm:text-[36px] sm:leading-[44px]">
        Assinar {kit.nome}
      </h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        {kit.quantidadePratos} pratos por {formatarCentavos(kit.precoCentavos)} a cada entrega, na frequência que
        você escolher.
      </p>

      {pratos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">O cardápio está em preparação.</p>
      ) : (
        <AssinarForm kit={kit} pratos={pratos} enderecos={opcoes} />
      )}
    </div>
  );
}
