import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { buscarKitVitrinePorSlug, listarPratosVitrine } from "@/db/queries/loja";
import { formatarCentavos } from "@/lib/calculations";
import { MontarKit } from "@/components/montar-kit";

export async function generateMetadata({ params }: PageProps<"/kit/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const kit = await buscarKitVitrinePorSlug(slug);
  if (!kit) return { title: "Kit não encontrado — Safran" };
  return {
    title: `${kit.nome} — Safran Congelados`,
    description: kit.descricao ?? `Monte seu kit com ${kit.quantidadePratos} pratos.`,
  };
}

export default async function KitPage({ params }: PageProps<"/kit/[slug]">) {
  const { slug } = await params;
  const [kit, pratos] = await Promise.all([buscarKitVitrinePorSlug(slug), listarPratosVitrine()]);
  if (!kit) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cardápio
      </Link>

      <div className="mt-5">
        <h1 className="font-display text-[28px] font-semibold leading-9 text-foreground sm:text-[36px] sm:leading-[44px]">
          {kit.nome}
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          {kit.descricao ??
            `Escolha ${kit.quantidadePratos} pratos do cardápio por ${formatarCentavos(kit.precoCentavos)}.`}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <CalendarClock className="size-5 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Quer receber sempre? Na assinatura você escolhe os pratos de cada entrega — e se não mexer, repetimos a
            última.
          </p>
          <Link
            href={`/assinar/${kit.slug}`}
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Assinar este kit
          </Link>
        </div>
      </div>

      {pratos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">
          O cardápio está em preparação. Volte em breve para montar o seu kit.
        </p>
      ) : (
        <MontarKit kit={kit} pratos={pratos} />
      )}
    </div>
  );
}
