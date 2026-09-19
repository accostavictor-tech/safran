import Link from "next/link";
import { Wheat, Milk, Beef } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarCentavos } from "@/lib/calculations";
import type { PratoVitrine } from "@/lib/vitrine";

export function PratoCard({ prato }: { prato: PratoVitrine }) {
  return (
    <Link
      href={`/prato/${prato.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-elevation-1 transition hover:border-primary/40 hover:shadow-elevation-2"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {prato.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prato.fotoUrl}
            alt={prato.nome}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-faint/40">
            <Beef className="size-10" />
          </div>
        )}

        {prato.estoqueLimitado && prato.estoqueUnidades <= 5 ? (
          <span className="absolute left-2 top-2 rounded-full bg-warning px-2.5 py-0.5 text-[11px] font-bold leading-[14px] text-warning-foreground">
            Últimas {prato.estoqueUnidades}
          </span>
        ) : null}

        {/* Selos nutricionais flutuantes: o que o cliente checa antes do preço. */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {prato.macros.proteinas > 0 ? (
            <span className="rounded-full bg-success px-2 py-0.5 text-[11px] font-bold leading-[14px] text-success-foreground">
              {prato.macros.proteinas.toFixed(0)}g proteína
            </span>
          ) : null}
          <span className="rounded-full bg-[rgb(39_31_48/0.75)] px-2 py-0.5 text-[11px] font-bold leading-[14px] text-white backdrop-blur-sm">
            {prato.pesoTotalG.toFixed(0)}g · {prato.macros.energiaKcal.toFixed(0)} kcal
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[18px] font-semibold leading-6 text-foreground group-hover:text-primary">
          {prato.nome}
        </h3>
        {prato.descricao ? (
          <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted-foreground">{prato.descricao}</p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1">
          {!prato.temGluten ? <Badge variant="success">Sem glúten</Badge> : null}
          {!prato.temLactose ? <Badge variant="success">Sem lactose</Badge> : null}
          {prato.temGluten ? (
            <Badge variant="secondary">
              <Wheat className="size-3" />
              Glúten
            </Badge>
          ) : null}
          {prato.temLactose ? (
            <Badge variant="secondary">
              <Milk className="size-3" />
              Lactose
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto pt-3">
          <span className="font-display text-[18px] font-semibold leading-6 tabular-nums text-foreground">
            {formatarCentavos(prato.precoVendaCentavos)}
          </span>
        </div>
      </div>
    </Link>
  );
}
