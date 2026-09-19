"use client";

import { useMemo, useState } from "react";
import { PratoCard } from "@/components/prato-card";
import { agruparPorCategoria, type PratoVitrine } from "@/lib/vitrine";

type Filtro = "" | "sem-gluten" | "sem-lactose";

const FILTROS: { chave: Filtro; label: string }[] = [
  { chave: "", label: "Tudo" },
  { chave: "sem-gluten", label: "Sem glúten" },
  { chave: "sem-lactose", label: "Sem lactose" },
];

function aplicarFiltro(lista: PratoVitrine[], filtro: Filtro): PratoVitrine[] {
  if (filtro === "sem-gluten") return lista.filter((p) => !p.temGluten);
  if (filtro === "sem-lactose") return lista.filter((p) => !p.temLactose);
  return lista;
}

/**
 * O filtro roda no cliente para que a página do cardápio continue estática:
 * são poucas dezenas de pratos, e assim trocar de filtro é instantâneo em vez
 * de uma navegação por consulta.
 */
export function Cardapio({ pratos }: { pratos: PratoVitrine[] }) {
  const [filtro, setFiltro] = useState<Filtro>("");

  const contagens = useMemo(
    () => new Map(FILTROS.map((f) => [f.chave, aplicarFiltro(pratos, f.chave).length])),
    [pratos]
  );
  const visiveis = useMemo(() => aplicarFiltro(pratos, filtro), [pratos, filtro]);
  const grupos = useMemo(() => agruparPorCategoria(visiveis), [visiveis]);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const ativo = filtro === f.chave;
          return (
            <button
              key={f.chave || "tudo"}
              type="button"
              onClick={() => setFiltro(f.chave)}
              aria-pressed={ativo}
              className={
                ativo
                  ? "rounded-full bg-primary px-4 py-2 text-xs font-semibold leading-4 text-primary-foreground shadow-elevation-1"
                  : "rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold leading-4 text-foreground transition hover:border-primary/40"
              }
            >
              {f.label}
              <span className="ml-1.5 tabular-nums opacity-60">{contagens.get(f.chave)}</span>
            </button>
          );
        })}
      </div>

      {visiveis.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted-foreground">
          Nenhum prato atende a esse filtro no momento.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {grupos.map((grupo) => (
            <section key={grupo.categoria}>
              {grupos.length > 1 ? (
                <h2 className="mb-3 font-display text-[22px] font-semibold leading-7 text-foreground">
                  {grupo.categoria}
                </h2>
              ) : null}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grupo.pratos.map((prato) => (
                  <PratoCard key={prato.id} prato={prato} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
