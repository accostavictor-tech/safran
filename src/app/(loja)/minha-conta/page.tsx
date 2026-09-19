import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Wallet, PackageOpen } from "lucide-react";
import { db } from "@/db";
import { pedidos } from "@/db/schema";
import { saldoCreditoCentavos } from "@/db/queries/cupons";
import { obterSessaoCliente } from "@/lib/auth";
import { sairDaContaAction } from "@/actions/conta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { formatarTelefone } from "@/lib/loja";
import { CASHBACK_PCT, MINIMO_USO_CENTAVOS, podeUsar } from "@/lib/cashback";
import { STATUS_LABEL } from "@/lib/pedido-status";

export const metadata: Metadata = { title: "Minha conta — Safran Congelados", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const sessao = await obterSessaoCliente();
  if (!sessao) redirect("/entrar");

  const [saldo, meusPedidos] = await Promise.all([
    saldoCreditoCentavos(sessao.clienteId),
    db.select().from(pedidos).where(eq(pedidos.clienteId, sessao.clienteId)).orderBy(desc(pedidos.createdAt)).limit(20),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Minha conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">{formatarTelefone(sessao.telefone)}</p>
        </div>
        <form action={sairDaContaAction}>
          <Button type="submit" variant="secondary" size="sm">
            Sair
          </Button>
        </form>
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-5">
          <div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Wallet className="size-4" />
              Seu cashback
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">{formatarCentavos(saldo)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {podeUsar(saldo)
                ? "Use no próximo pedido, no checkout."
                : `A partir de ${formatarCentavos(MINIMO_USO_CENTAVOS)} você pode usar no checkout.`}
            </p>
          </div>
          <p className="max-w-[16rem] text-xs text-muted-foreground">
            Você recebe {CASHBACK_PCT}% de volta em crédito a cada pedido entregue.
          </p>
        </CardContent>
      </Card>

      <h2 className="mt-8 font-semibold text-foreground">Meus pedidos</h2>

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
