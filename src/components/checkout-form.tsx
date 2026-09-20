"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, startTransition } from "react";
import { ShoppingBag, TicketPercent, Wallet } from "lucide-react";
import { criarPedidoAction, type CheckoutState } from "@/actions/pedidos";
import { conferirCupomAction, type PreviaCupom } from "@/actions/cupons";
import { useCarrinho } from "@/lib/carrinho-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatarCentavos } from "@/lib/calculations";
import { formatarTelefone } from "@/lib/loja";
import { calcularSubtotal, calcularTotal, faltaParaMinimo, resolverFrete, PEDIDO_MINIMO_CENTAVOS } from "@/lib/loja";
import { creditoAplicavel, podeUsar } from "@/lib/cashback";
import { resumirKit } from "@/lib/kits";
import type { KitVitrine, PratoVitrine } from "@/lib/vitrine";

const initialState: CheckoutState = {};

export interface BairroOpcao {
  bairro: string;
  zonaNome: string;
  freteCentavos: number;
  freteGratisAcimaCentavos: number | null;
}

export function CheckoutForm({
  pratos,
  kits,
  bairros,
  conta,
}: {
  pratos: PratoVitrine[];
  kits: KitVitrine[];
  bairros: BairroOpcao[];
  /** Cliente logado e saldo de cashback, quando houver sessão. */
  conta: { nome: string; telefone: string; saldoCentavos: number } | null;
}) {
  const [state, formAction, pending] = useActionState(criarPedidoAction, initialState);
  const { itens, kits: kitsNoCarrinho, carregado } = useCarrinho();
  const [bairro, setBairro] = useState("");
  const [codigoCupom, setCodigoCupom] = useState("");
  const [usarCredito, setUsarCredito] = useState(false);
  const [cupom, setCupom] = useState<PreviaCupom | null>(null);
  const [conferindo, iniciarConferencia] = useTransition();

  function conferirCupom() {
    const codigo = codigoCupom.trim();
    if (!codigo) return;
    iniciarConferencia(async () => {
      setCupom(await conferirCupomAction(codigo, itens));
    });
  }

  function limparCupom() {
    setCupom(null);
    setCodigoCupom("");
  }

  const porId = useMemo(() => new Map(pratos.map((p) => [p.id, p])), [pratos]);
  const linhas = itens
    .map((i) => {
      const prato = porId.get(i.pratoId);
      return prato ? { prato, quantidade: i.quantidade } : null;
    })
    .filter((l): l is { prato: PratoVitrine; quantidade: number } => l !== null);

  const kitPorId = useMemo(() => new Map(kits.map((k) => [k.id, k])), [kits]);
  // Mesma regra do carrinho: kit só vale com o kit publicado e a composição
  // inteira ainda no cardápio.
  const linhasKit = kitsNoCarrinho
    .map((noCarrinho) => {
      const kit = kitPorId.get(noCarrinho.kitId);
      if (!kit) return null;
      const escolhidos = noCarrinho.pratoIds.map((id) => porId.get(id));
      if (escolhidos.some((p) => p === undefined)) return null;
      const validos = escolhidos as PratoVitrine[];
      return { noCarrinho, kit, resumo: resumirKit(kit, validos) };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const subtotal = calcularSubtotal([
    ...linhas.map((l) => ({ precoUnitarioCentavos: l.prato.precoVendaCentavos, quantidade: l.quantidade })),
    ...linhasKit.map((l) => ({
      precoUnitarioCentavos: l.resumo.totalCentavos,
      quantidade: l.noCarrinho.quantidade,
    })),
  ]);
  const zonaEscolhida = bairros.find((b) => b.bairro === bairro) ?? null;
  const freteBase = resolverFrete(zonaEscolhida, subtotal);
  const cupomValido = cupom?.ok ? cupom : null;
  const frete = cupomValido?.freteGratis ? 0 : freteBase;
  const descontoCupom = cupomValido?.descontoCentavos ?? 0;
  const creditoDisponivel = conta?.saldoCentavos ?? 0;
  const creditoUsado = usarCredito ? creditoAplicavel(creditoDisponivel, Math.max(0, subtotal - descontoCupom)) : 0;
  const desconto = descontoCupom + creditoUsado;
  const total = calcularTotal(subtotal, frete, desconto);
  const falta = faltaParaMinimo(subtotal);

  const itensJson = JSON.stringify(itens);
  const kitsJson = JSON.stringify(
    linhasKit.map((l) => ({
      kitId: l.kit.id,
      pratoIds: l.noCarrinho.pratoIds,
      quantidade: l.noCarrinho.quantidade,
    }))
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  if (!carregado) return <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />;

  if (linhas.length === 0 && linhasKit.length === 0) {
    return (
      <div className="mt-10 rounded-xl border border-dashed border-border py-16 text-center">
        <ShoppingBag className="mx-auto size-8 text-muted-foreground/40" />
        <p className="mt-3 font-medium text-foreground">Seu carrinho está vazio</p>
        <Link href="/" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
          Ver o cardápio
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <input type="hidden" name="itens" value={itensJson} />
      <input type="hidden" name="kits" value={kitsJson} />
      {cupomValido ? <input type="hidden" name="cupom" value={cupomValido.codigo} /> : null}
      {creditoUsado > 0 ? <input type="hidden" name="usarCredito" value="on" /> : null}

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" required autoComplete="name" defaultValue={conta?.nome || undefined} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input id="telefone" name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(82) 99999-9999" defaultValue={conta ? formatarTelefone(conta.telefone) : undefined} />
              <p className="text-xs text-muted-foreground">É por aqui que avisamos o andamento do pedido.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entrega</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="bairro">Bairro</Label>
              <Select name="bairro" value={bairro} onValueChange={setBairro} required>
                <SelectTrigger id="bairro" className="w-full">
                  <SelectValue placeholder="Selecione o bairro..." />
                </SelectTrigger>
                <SelectContent>
                  {bairros.map((b) => (
                    <SelectItem key={b.bairro} value={b.bairro}>
                      {b.bairro} — frete {formatarCentavos(b.freteCentavos)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Entregamos nesses bairros. Está fora da lista?{" "}
                <a href="https://wa.me/5582999550922" className="text-primary hover:underline">
                  fale com a gente
                </a>
                .
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="logradouro">Rua</Label>
              <Input id="logradouro" name="logradouro" required autoComplete="address-line1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número</Label>
              <Input id="numero" name="numero" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="complemento">Complemento</Label>
              <Input id="complemento" name="complemento" placeholder="Apto, bloco..." />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Ponto de referência</Label>
              <Input id="referencia" name="referencia" placeholder="Perto de..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" rows={2} placeholder="Melhor horário para entregar, etc." />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-24 lg:self-start">
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {linhas.map(({ prato, quantidade }) => (
              <li key={prato.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  {quantidade}× {prato.nome}
                </span>
                <span className="tabular-nums text-foreground">
                  {formatarCentavos(prato.precoVendaCentavos * quantidade)}
                </span>
              </li>
            ))}
          </ul>

          <Separator className="my-3" />

          {cupomValido ? (
            <div className="mb-3 flex items-center justify-between gap-2 rounded-md bg-success/10 p-2.5">
              <span className="flex items-center gap-1.5 text-sm text-success">
                <TicketPercent className="size-4 shrink-0" />
                <span className="font-medium">{cupomValido.codigo}</span> aplicado
              </span>
              <button
                type="button"
                onClick={limparCupom}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                remover
              </button>
            </div>
          ) : (
            <div className="mb-3 space-y-1.5">
              <Label htmlFor="codigoCupom" className="text-xs">
                Cupom de desconto
              </Label>
              <div className="flex gap-2">
                <Input
                  id="codigoCupom"
                  value={codigoCupom}
                  onChange={(e) => setCodigoCupom(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      conferirCupom();
                    }
                  }}
                  placeholder="CODIGO"
                  className="h-9 font-mono uppercase"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={conferirCupom}
                  loading={conferindo}
                  disabled={conferindo || codigoCupom.trim().length === 0}
                  className="h-9 shrink-0"
                >
                  Aplicar
                </Button>
              </div>
              {cupom && !cupom.ok ? <p className="text-xs text-destructive">{cupom.mensagem}</p> : null}
            </div>
          )}

          {conta && podeUsar(creditoDisponivel) ? (
            <label className="mb-3 flex items-start gap-2 rounded-md bg-primary/5 p-2.5 text-sm">
              <input
                type="checkbox"
                checked={usarCredito}
                onChange={(e) => setUsarCredito(e.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Wallet className="size-3.5" />
                  Usar meu cashback
                </span>
                <span className="block text-xs text-muted-foreground">
                  Você tem {formatarCentavos(creditoDisponivel)} de crédito.
                </span>
              </span>
            </label>
          ) : null}

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums text-foreground">{formatarCentavos(subtotal)}</dd>
            </div>
            {descontoCupom > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Desconto ({cupomValido?.codigo})</dt>
                <dd className="tabular-nums">− {formatarCentavos(descontoCupom)}</dd>
              </div>
            ) : null}
            {creditoUsado > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Cashback usado</dt>
                <dd className="tabular-nums">− {formatarCentavos(creditoUsado)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Entrega{zonaEscolhida ? ` (${zonaEscolhida.zonaNome})` : ""}</dt>
              <dd className="tabular-nums text-foreground">
                {!bairro ? (
                  "—"
                ) : cupomValido?.freteGratis ? (
                  <>
                    <span className="mr-1 text-muted-foreground line-through">{formatarCentavos(freteBase)}</span>
                    <span className="text-success">grátis</span>
                  </>
                ) : (
                  formatarCentavos(frete)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-medium text-foreground">Total</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatarCentavos(total)}</dd>
            </div>
          </dl>

          {falta > 0 ? (
            <p className="mt-4 rounded-md bg-warning-soft p-2 text-xs text-on-warning-soft">
              Faltam {formatarCentavos(falta)} para o mínimo de {formatarCentavos(PEDIDO_MINIMO_CENTAVOS)}.
            </p>
          ) : null}

          {state.erro ? <p className="mt-4 text-sm text-destructive">{state.erro}</p> : null}

          <Button type="submit" loading={pending} disabled={falta > 0} className="mt-4 h-11 w-full">
            {pending ? "Enviando..." : "Confirmar pedido"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            O pagamento é combinado no WhatsApp depois de confirmar.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
