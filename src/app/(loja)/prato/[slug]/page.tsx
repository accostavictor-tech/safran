import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Wheat, Milk, Beef } from "lucide-react";
import { buscarPratoVitrinePorSlug } from "@/db/queries/loja";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatarCentavos } from "@/lib/calculations";

export async function generateMetadata({ params }: PageProps<"/prato/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const prato = await buscarPratoVitrinePorSlug(slug);
  if (!prato) return { title: "Prato não encontrado — Safran" };
  return {
    title: `${prato.nome} — Safran Congelados`,
    description: prato.descricao ?? undefined,
  };
}

export default async function PratoPage({ params }: PageProps<"/prato/[slug]">) {
  const { slug } = await params;
  const prato = await buscarPratoVitrinePorSlug(slug);
  if (!prato) notFound();

  const m = prato.macros;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cardápio
      </Link>

      <div className="mt-5 grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          <div className="aspect-[4/3]">
            {prato.fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={prato.fotoUrl} alt={prato.nome} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground/30">
                <Beef className="size-12" />
              </div>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{prato.nome}</h1>
          {prato.descricao ? <p className="mt-2 text-muted-foreground">{prato.descricao}</p> : null}

          <div className="mt-4 flex flex-wrap gap-1.5">
            {!prato.temGluten ? <Badge variant="success">Sem glúten</Badge> : null}
            {!prato.temLactose ? <Badge variant="success">Sem lactose</Badge> : null}
            {prato.temGluten ? (
              <Badge variant="amber">
                <Wheat className="size-3" />
                Contém glúten
              </Badge>
            ) : null}
            {prato.temLactose ? (
              <Badge variant="sky">
                <Milk className="size-3" />
                Contém lactose
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">
              {formatarCentavos(prato.precoVendaCentavos)}
            </span>
            <span className="text-sm text-muted-foreground">porção de {prato.pesoTotalG.toFixed(0)} g</span>
          </div>

          {prato.estoqueLimitado ? (
            <p className="mt-2 text-sm text-warning-foreground">
              {prato.estoqueUnidades} {prato.estoqueUnidades === 1 ? "unidade" : "unidades"} em estoque
            </p>
          ) : null}

          {/* O carrinho entra na próxima fase; por ora o pedido segue pelo WhatsApp. */}
          <a
            href={`https://wa.me/5582999550922?text=${encodeURIComponent(`Olá! Quero pedir: ${prato.nome}`)}`}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Pedir pelo WhatsApp
          </a>
        </div>
      </div>

      <Card className="mt-10">
        <CardContent className="pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold text-foreground">Informação nutricional</h2>
            <span className="text-xs text-muted-foreground">porção de {prato.pesoTotalG.toFixed(0)} g</span>
          </div>
          <Separator className="my-3" />
          <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
            <LinhaNutri label="Valor energético" valor={`${m.energiaKcal.toFixed(0)} kcal`} />
            <LinhaNutri label="Carboidratos" valor={`${m.carboidratos.toFixed(1)} g`} />
            <LinhaNutri label="Açúcares totais" valor={`${m.acucaresTotais.toFixed(1)} g`} />
            <LinhaNutri label="Proteínas" valor={`${m.proteinas.toFixed(1)} g`} />
            <LinhaNutri label="Gorduras totais" valor={`${m.gordurasTotais.toFixed(1)} g`} />
            <LinhaNutri label="Gorduras saturadas" valor={`${m.gordurasSaturadas.toFixed(1)} g`} />
            <LinhaNutri label="Gorduras trans" valor={`${m.gordurasTrans.toFixed(1)} g`} />
            <LinhaNutri label="Fibra alimentar" valor={`${m.fibraAlimentar.toFixed(1)} g`} />
            <LinhaNutri label="Sódio" valor={`${m.sodio.toFixed(0)} mg`} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function LinhaNutri({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums text-foreground">{valor}</dd>
    </div>
  );
}
