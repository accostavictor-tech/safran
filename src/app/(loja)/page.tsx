import Link from "next/link";
import { UtensilsCrossed, PackagePlus } from "lucide-react";
import { listarKitsVitrine, listarPratosVitrine } from "@/db/queries/loja";
import { formatarCentavos } from "@/lib/calculations";
import { Cardapio } from "@/components/cardapio";

export default async function CardapioPage() {
  const [pratos, kits] = await Promise.all([listarPratosVitrine(), listarKitsVitrine()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="max-w-xl">
        <h1 className="font-display text-[30px] font-bold leading-[38px] text-foreground sm:text-[40px] sm:leading-[48px]">
          Comida de verdade, pronta quando você precisar
        </h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          Refeições congeladas feitas à mão em Maceió. Escolha os seus pratos e receba em casa.
        </p>
      </div>

      {/* Kits antes do cardápio: é a compra que a Safran quer estimular, e quem
          chega para comprar a semana inteira não deve ter de montar item a item. */}
      {kits.length > 0 && pratos.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {kits.map((kit) => (
            <Link
              key={kit.id}
              href={`/kit/${kit.slug}`}
              className="group rounded-xl border border-border bg-card p-5 shadow-elevation-1 transition hover:border-primary/50 hover:shadow-elevation-2"
            >
              <PackagePlus className="size-5 text-primary" />
              <p className="mt-2 font-display text-[20px] font-semibold leading-7 text-foreground">{kit.nome}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {kit.descricao ?? `Escolha ${kit.quantidadePratos} pratos do cardápio.`}
              </p>
              <p className="mt-3 font-display text-[22px] font-bold leading-7 tabular-nums text-primary">
                {formatarCentavos(kit.precoCentavos)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  · {kit.quantidadePratos} pratos
                </span>
              </p>
              <span className="mt-2 inline-block text-sm font-medium text-primary group-hover:underline">
                Montar kit
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {pratos.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border py-16 text-center">
          <UtensilsCrossed className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 font-medium text-foreground">Cardápio em preparação</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Em breve os pratos estarão aqui. Fale com a gente pelo WhatsApp.
          </p>
        </div>
      ) : (
        <Cardapio pratos={pratos} />
      )}
    </div>
  );
}
