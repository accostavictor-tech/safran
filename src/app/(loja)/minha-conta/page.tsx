import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, MapPin, PackageOpen, Star, Trash2, Wallet } from "lucide-react";
import { db } from "@/db";
import { pedidos } from "@/db/schema";
import { saldoCreditoCentavos } from "@/db/queries/cupons";
import { buscarCliente, extratoCredito, listarEnderecos, totalAcumuladoCentavos } from "@/db/queries/conta";
import { listarBairrosAtendidos } from "@/db/queries/loja";
import { obterSessaoCliente } from "@/lib/auth";
import { definirEnderecoPadraoAction, excluirEnderecoAction, sairDaContaAction } from "@/actions/conta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { formatarTelefone } from "@/lib/loja";
import { formatarEndereco } from "@/lib/enderecos";
import { CASHBACK_PCT, MINIMO_USO_CENTAVOS, podeUsar, rotuloMotivo } from "@/lib/cashback";
import { STATUS_LABEL } from "@/lib/pedido-status";
import { PerfilForm } from "@/components/perfil-form";
import { EnderecoForm } from "@/components/endereco-form";

export const metadata: Metadata = { title: "Minha conta — Safran Congelados", robots: { index: false } };
export const dynamic = "force-dynamic";

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export default async function MinhaContaPage() {
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");

  const [cliente, saldo, acumulado, movimentos, enderecosDoCliente, bairros, meusPedidos] = await Promise.all([
    buscarCliente(sessao.clienteId),
    saldoCreditoCentavos(sessao.clienteId),
    totalAcumuladoCentavos(sessao.clienteId),
    extratoCredito(sessao.clienteId),
    listarEnderecos(sessao.clienteId),
    listarBairrosAtendidos(),
    db.select().from(pedidos).where(eq(pedidos.clienteId, sessao.clienteId)).orderBy(desc(pedidos.createdAt)).limit(20),
  ]);

  const nomesBairros = [...new Set(bairros.map((b) => b.bairro))];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-9 text-foreground">
            {cliente?.nome?.trim() ? `Olá, ${cliente.nome.split(" ")[0]}` : "Minha conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatarTelefone(sessao.telefone)}</p>
        </div>
        <form action={sairDaContaAction}>
          <Button type="submit" variant="secondary" size="sm">
            Sair
          </Button>
        </form>
      </div>

      {/* --- Carteira --- */}
      <Card className="mt-6">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Wallet className="size-4" />
                Saldo em crédito
              </p>
              <p className="mt-1 font-display text-[32px] font-bold leading-10 tabular-nums text-primary">
                {formatarCentavos(saldo)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {podeUsar(saldo)
                  ? "Use no próximo pedido, no checkout."
                  : `A partir de ${formatarCentavos(MINIMO_USO_CENTAVOS)} você pode usar no checkout.`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Já recebido</p>
              <p className="font-display text-[20px] font-semibold leading-7 tabular-nums text-foreground">
                {formatarCentavos(acumulado)}
              </p>
              <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
                {CASHBACK_PCT}% de volta em crédito a cada pedido entregue.
              </p>
            </div>
          </div>

          {movimentos.length > 0 ? (
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-faint">Extrato</p>
              <ul className="mt-2 divide-y divide-border/60">
                {movimentos.map((m) => {
                  const entrada = m.centavos > 0;
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={
                            entrada
                              ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-on-success-soft"
                              : "flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
                          }
                        >
                          {entrada ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{rotuloMotivo(m.motivo)}</p>
                          <p className="text-xs text-muted-foreground">
                            {DATA_CURTA.format(new Date(m.createdAt))}
                            {m.pedidoCodigo !== null ? ` · ${formatarCodigo("PED", m.pedidoCodigo)}` : ""}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          entrada
                            ? "shrink-0 font-medium tabular-nums text-on-success-soft"
                            : "shrink-0 font-medium tabular-nums text-muted-foreground"
                        }
                      >
                        {entrada ? "+" : "−"} {formatarCentavos(Math.abs(m.centavos))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* --- Perfil --- */}
      <h2 className="mt-8 font-display text-[22px] font-semibold leading-7 text-foreground">Meus dados</h2>
      <Card className="mt-3">
        <CardContent className="pt-5">
          <PerfilForm nome={cliente?.nome ?? ""} email={cliente?.email ?? null} />
          <p className="mt-3 text-xs text-muted-foreground">
            O WhatsApp {formatarTelefone(sessao.telefone)} é o seu login e não muda por aqui. Para trocar, fale com a
            gente.
          </p>
        </CardContent>
      </Card>

      {/* --- Endereços --- */}
      <h2 className="mt-8 font-display text-[22px] font-semibold leading-7 text-foreground">Meus endereços</h2>

      {enderecosDoCliente.length > 0 ? (
        <div className="mt-3 space-y-2">
          {enderecosDoCliente.map((endereco) => (
            <div
              key={endereco.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{formatarEndereco(endereco)}</p>
                  {endereco.padrao ? <Badge variant="success">Padrão</Badge> : null}
                </div>
                {endereco.referencia ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{endereco.referencia}</p>
                ) : null}
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  {endereco.zonaNome !== null && endereco.freteCentavos !== null ? (
                    <>
                      {endereco.zonaNome} · frete {formatarCentavos(endereco.freteCentavos)}
                    </>
                  ) : (
                    <span className="text-on-warning-soft">Bairro fora das zonas de entrega no momento</span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!endereco.padrao ? (
                  <form action={definirEnderecoPadraoAction}>
                    <input type="hidden" name="id" value={endereco.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      <Star className="size-3.5" />
                      Usar como padrão
                    </Button>
                  </form>
                ) : null}
                <form action={excluirEnderecoAction}>
                  <input type="hidden" name="id" value={endereco.id} />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    aria-label="Excluir endereço"
                    className="text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Nenhum endereço salvo ainda. O endereço do seu próximo pedido fica guardado aqui.
        </p>
      )}

      <div className="mt-3">
        <EnderecoForm bairros={nomesBairros} />
      </div>

      {/* --- Pedidos --- */}
      <h2 className="mt-8 font-display text-[22px] font-semibold leading-7 text-foreground">Meus pedidos</h2>

      {meusPedidos.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border py-12 text-center">
          <PackageOpen className="mx-auto size-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">Você ainda não fez pedidos por aqui.</p>
          <Link href="/" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Ver o cardápio
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {meusPedidos.map((pedido) => (
            <Link
              key={pedido.id}
              href={`/pedido/${pedido.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition hover:border-primary/40"
            >
              <div>
                <p className="font-mono text-sm font-medium text-foreground">
                  {formatarCodigo("PED", pedido.codigo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(pedido.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{STATUS_LABEL[pedido.status]}</Badge>
                <span className="font-medium tabular-nums text-foreground">
                  {formatarCentavos(pedido.totalCentavos)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
