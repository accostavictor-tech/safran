import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock, MapPin, Pause, Play, PackagePlus } from "lucide-react";
import { buscarAssinatura, listarCiclos } from "@/db/queries/assinaturas";
import { listarKitsVitrine, listarPratosVitrine } from "@/db/queries/loja";
import { obterSessaoCliente } from "@/lib/auth";
import { cancelarAssinaturaAction, pausarAssinaturaAction } from "@/actions/assinaturas";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { formatarEndereco } from "@/lib/enderecos";
import { resumirKit } from "@/lib/kits";
import {
  ANTECEDENCIA_EDICAO_DIAS,
  composicaoEfetiva,
  diasAte,
  FREQUENCIA_LABEL,
  podeEditarProximoCiclo,
} from "@/lib/assinaturas";
import { EditarComposicao } from "@/components/editar-composicao";

export const metadata: Metadata = { title: "Minha assinatura — Safran Congelados", robots: { index: false } };
export const dynamic = "force-dynamic";

const DATA_LONGA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default async function AssinaturaPage({ params }: PageProps<"/assinatura/[id]">) {
  const { id } = await params;
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");

  const completa = await buscarAssinatura(id);
  // Filtro por dono na aplicação, e não só na consulta: o id é adivinhável o
  // bastante para não ser a única proteção.
  if (!completa || completa.assinatura.clienteId !== sessao.clienteId) notFound();

  const { assinatura, kit, endereco, zona } = completa;
  const [pratos, kitsVitrine, ciclos] = await Promise.all([
    listarPratosVitrine(),
    listarKitsVitrine(),
    listarCiclos(assinatura.id),
  ]);

  const kitVitrine = kitsVitrine.find((k) => k.id === kit.id) ?? null;
  const composicao = composicaoEfetiva(assinatura);
  const porId = new Map(pratos.map((p) => [p.id, p]));
  const escolhidos = composicao.map((pratoId) => porId.get(pratoId)).filter((p) => p !== undefined);
  const resumo = kitVitrine ? resumirKit(kitVitrine, escolhidos) : null;

  const dias = diasAte(assinatura.proximaEntrega);
  const podeEditar = assinatura.status === "ativa" && podeEditarProximoCiclo(assinatura.proximaEntrega);
  const ativa = assinatura.status === "ativa";

  const contagem = new Map<string, number>();
  for (const p of escolhidos) contagem.set(p.nome, (contagem.get(p.nome) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/minha-conta" className="text-sm text-muted-foreground transition hover:text-foreground">
        ← Minha conta
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-9 text-foreground">{kit.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatarCodigo("PED", assinatura.codigo).replace("PED", "ASS")} ·{" "}
            {FREQUENCIA_LABEL[assinatura.frequencia]}
          </p>
        </div>
        <Badge variant={ativa ? "success" : "warning"}>{ativa ? "Ativa" : "Pausada"}</Badge>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-5">
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarClock className="size-4" />
            {ativa ? "Próxima entrega" : "Retomaria em"}
          </p>
          <p className="mt-1 font-display text-[22px] font-semibold leading-7 text-foreground first-letter:uppercase">
            {DATA_LONGA.format(assinatura.proximaEntrega)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {dias <= 0 ? "a caminho" : dias === 1 ? "amanhã" : `em ${dias} dias`}
          </p>

          <div className="mt-4 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <PackagePlus className="size-4 text-primary" />
              O que vem nesta entrega
            </p>
            <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {[...contagem.entries()].map(([nome, vezes]) => (
                <li key={nome}>
                  {vezes > 1 ? `${vezes}× ` : ""}
                  {nome}
                </li>
              ))}
            </ul>
            {escolhidos.length < composicao.length ? (
              <p className="mt-2 text-sm text-on-warning-soft">
                {composicao.length - escolhidos.length}{" "}
                {composicao.length - escolhidos.length === 1 ? "prato saiu" : "pratos saíram"} do cardápio. Troque a
                seleção para esta entrega não falhar.
              </p>
            ) : null}
            {resumo ? (
              <p className="mt-3 font-display text-[20px] font-bold leading-7 tabular-nums text-primary">
                {formatarCentavos(resumo.totalCentavos)}
                {zona ? (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    + {formatarCentavos(zona.freteCentavos)} de entrega
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>

          {endereco ? (
            <p className="mt-4 flex items-center gap-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {formatarEndereco(endereco)}
              {!zona ? <span className="text-on-warning-soft"> · bairro fora das zonas de entrega</span> : null}
            </p>
          ) : (
            <p className="mt-4 border-t border-border pt-4 text-sm text-on-warning-soft">
              Esta assinatura está sem endereço. Cadastre um em Minha conta.
            </p>
          )}
        </CardContent>
      </Card>

      {podeEditar && kitVitrine ? (
        <div className="mt-4">
          <EditarComposicao assinaturaId={assinatura.id} kit={kitVitrine} pratos={pratos} atual={composicao} />
        </div>
      ) : ativa ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Esta entrega já entrou em produção. Trocas valem para entregas com pelo menos{" "}
          {ANTECEDENCIA_EDICAO_DIAS} dias de antecedência.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <form action={pausarAssinaturaAction}>
          <input type="hidden" name="id" value={assinatura.id} />
          <Button type="submit" variant="secondary">
            {ativa ? (
              <>
                <Pause className="size-4" />
                Pausar
              </>
            ) : (
              <>
                <Play className="size-4" />
                Retomar
              </>
            )}
          </Button>
        </form>
        <form action={cancelarAssinaturaAction}>
          <input type="hidden" name="id" value={assinatura.id} />
          <Button type="submit" variant="secondary" className="text-destructive">
            Cancelar assinatura
          </Button>
        </form>
      </div>

      {ciclos.length > 0 ? (
        <>
          <h2 className="mt-10 font-display text-[22px] font-semibold leading-7 text-foreground">
            Entregas anteriores
          </h2>
          <div className="mt-3 space-y-2">
            {ciclos.map((ciclo) => (
              <div
                key={ciclo.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm"
              >
                <span className="text-foreground">{DATA_CURTA.format(ciclo.dataEntrega)}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {ciclo.composicao
                    .map((c) => (c.quantidade > 1 ? `${c.quantidade}× ${c.nome}` : c.nome))
                    .join(" · ")}
                </span>
                {ciclo.pedidoId ? (
                  <Link href={`/pedido/${ciclo.pedidoId}`} className="font-medium text-primary hover:underline">
                    Ver pedido
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
