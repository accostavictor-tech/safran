import type { Metadata } from "next";
import { listarPratosVitrine } from "@/db/queries/loja";
import { CalculadoraDieta } from "@/components/calculadora-dieta";

export const metadata: Metadata = {
  title: "Monte sua dieta — Safran Congelados",
  description:
    "Informe suas metas de calorias e proteína e veja quais pratos congelados da Safran cabem na sua rotina.",
};

export default async function DietaPage() {
  const pratos = await listarPratosVitrine();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="max-w-xl">
        <h1 className="font-display text-[30px] font-bold leading-[38px] text-foreground sm:text-[36px] sm:leading-[44px]">
          Monte sua dieta
        </h1>
        <p className="mt-2 text-base leading-6 text-muted-foreground">
          Tem uma ficha da nutricionista? Copie as metas e a gente mostra quais pratos cabem em cada refeição — e
          monta a semana inteira de uma vez.
        </p>
      </div>

      {pratos.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">O cardápio está em preparação.</p>
      ) : (
        <CalculadoraDieta pratos={pratos} />
      )}
    </div>
  );
}
