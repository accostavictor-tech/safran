import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, Wheat, Milk, Beef, Snowflake, Microwave } from "lucide-react";
import { buscarPratoVitrinePorSlug } from "@/db/queries/loja";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatarCentavos } from "@/lib/calculations";
import { BotaoAdicionar } from "@/components/botao-adicionar";

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
        <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-elevation-1">
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
          <h1 className="font-display text-[24px] font-semibold leading-8 text-foreground sm:text-[32px] sm:leading-10">{prato.nome}</h1>
          {prato.descricao ? <p className="mt-2 text-muted-foreground">{prato.descricao}</p> : null}

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="sky">
              <Snowflake className="size-3" />
              Ultracongelado a -18 °C
            </Badge>
            <Badge variant="sky">
              <Microwave className="size-3" />
              Pronto em 5 min
            </Badge>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
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
            <span className="font-display text-[32px] font-bold leading-10 tabular-nums text-primary">
              {formatarCentavos(prato.precoVendaCentavos)}
            </span>
            <span className="text-sm text-muted-foreground">porção de {prato.pesoTotalG.toFixed(0)} g</span>
          </div>

          {prato.estoqueLimitado ? (
            <p className="mt-2 text-sm text-on-warning-soft">
              {prato.estoqueUnidades} {prato.estoqueUnidades === 1 ? "unidade" : "unidades"} em estoque
            </p>
          ) : null}

          <div className="mt-6">
            <BotaoAdicionar pratoId={prato.id} nome={prato.nome} />
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-[22px] font-semibold leading-7 text-foreground">Ficha nutricional</h2>
          <span className="text-xs text-muted-foreground">porção de {prato.pesoTotalG.toFixed(0)} g</span>
        </div>

        {/* Grade compacta: é o que o cliente confere antes de comprar. */}
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          <CelulaNutri label="Calorias" valor={m.energiaKcal.toFixed(0)} unidade="kcal" destaque />
          <CelulaNutri label="Proteínas" valor={m.proteinas.toFixed(0)} unidade="g" destaque />
          <CelulaNutri label="Carbos" valor={m.carboidratos.toFixed(0)} unidade="g" />
          <CelulaNutri label="Gorduras" valor={m.gordurasTotais.toFixed(0)} unidade="g" />
          <CelulaNutri label="Fibras" valor={m.fibraAlimentar.toFixed(0)} unidade="g" />
          <CelulaNutri label="Sódio" valor={m.sodio.toFixed(0)} unidade="mg" />
        </div>

        <Card className="mt-3">
          <CardContent className="pt-5">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
              <LinhaNutri label="Açúcares totais" valor={`${m.acucaresTotais.toFixed(1)} g`} />
              <LinhaNutri label="Gorduras saturadas" valor={`${m.gordurasSaturadas.toFixed(1)} g`} />
              <LinhaNutri label="Gorduras trans" valor={`${m.gordurasTrans.toFixed(1)} g`} />
            </dl>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-[22px] font-semibold leading-7 text-foreground">Simples, rápido e nutritivo</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PASSOS_PREPARO.map((passo, i) => (
            <div key={passo.titulo} className="rounded-lg border border-border bg-card p-4">
              <span className="text-[11px] font-bold leading-[14px] text-primary">PASSO {i + 1}</span>
              <p className="mt-1 font-display text-[18px] font-semibold leading-6 text-foreground">{passo.titulo}</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{passo.detalhe}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Modo de preparo padrão da linha congelada. Confirmar os tempos com a cozinha. */
const PASSOS_PREPARO = [
  { titulo: "Destampe", detalhe: "Solte um canto da tampa antes de aquecer." },
  { titulo: "Aqueça", detalhe: "5 a 6 min no micro-ondas em potência alta, ou 15 a 18 min no forno a 180 °C." },
  { titulo: "Saboreie", detalhe: "Espere 1 minuto e sirva." },
];

function CelulaNutri({
  label,
  valor,
  unidade,
  destaque,
}: {
  label: string;
  valor: string;
  unidade: string;
  destaque?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted px-2 py-3 text-center">
      <p className="text-xs leading-4 text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 text-[20px] font-bold leading-6 tabular-nums ${destaque ? "text-success" : "text-foreground"}`}
      >
        {valor}
      </p>
      <p className="text-[11px] leading-[14px] text-faint">{unidade}</p>
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
