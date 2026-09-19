import { UtensilsCrossed } from "lucide-react";
import { listarPratosVitrine } from "@/db/queries/loja";
import { Cardapio } from "@/components/cardapio";

export default async function CardapioPage() {
  const pratos = await listarPratosVitrine();

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
