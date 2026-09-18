import Link from "next/link";
import { Wheat, Milk, Flame, Beef } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatarCentavos } from "@/lib/calculations";
import type { PratoVitrine } from "@/lib/vitrine";

export function PratoCard({ prato }: { prato: PratoVitrine }) {
  return (
    <Link
      href={`/prato/${prato.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {prato.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prato.fotoUrl}
            alt={prato.nome}
            className="size-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground/30">
            <Beef className="size-10" />
          </div>
        )}
        {prato.estoqueLimitado && prato.estoqueUnidades <= 5 ? (
          <span className="absolute left-2 top-2 rounded-full bg-warning px-2 py-0.5 text-xs font-medium text-warning-foreground">
            Últimas {prato.estoqueUnidades}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-medium leading-snug text-foreground group-hover:text-primary">{prato.nome}</h3>
        {prato.descricao ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{prato.descricao}</p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap gap-1">
          {!prato.temGluten ? <Badge variant="secondary">Sem glúten</Badge> : null}
          {!prato.temLactose ? <Badge variant="secondary">Sem lactose</Badge> : null}
          {prato.temGluten ? (
            <Badge variant="amber">
              <Wheat className="size-3" />
              Glúten
            </Badge>
          ) : null}
          {prato.temLactose ? (
            <Badge variant="sky">
              <Milk className="size-3" />
              Lactose
            </Badge>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between pt-3">
          <span className="text-lg font-semibold text-foreground">{formatarCentavos(prato.precoVendaCentavos)}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Flame className="size-3.5" />
            {prato.macros.energiaKcal.toFixed(0)} kcal · {prato.pesoTotalG.toFixed(0)} g
          </span>
        </div>
      </div>
    </Link>
  );
}
