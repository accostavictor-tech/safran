"use client";

import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, startTransition } from "react";
import { ShoppingBag, TicketPercent } from "lucide-react";
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
import { calcularSubtotal, calcularTotal, faltaParaMinimo, resolverFrete, PEDIDO_MINIMO_CENTAVOS } from "@/lib/loja";
import type { PratoVitrine } from "@/lib/vitrine";

const initialState: CheckoutState = {};

export interface BairroOpcao {
  bairro: string;
  zonaNome: string;
  freteCentavos: number;
  freteGratisAcimaCentavos: number | null;
}

export function CheckoutForm({ pratos, bairros }: { pratos: PratoVitrine[]; bairros: BairroOpcao[] }) {
  const [state, formAction, pending] = useActionState(criarPedidoAction, initialState);
  const { itens, carregado } = useCarrinho();
  const [bairro, setBairro] = useState("");
  const [codigoCupom, setCodigoCupom] = useState("");
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

  const subtotal = calcularSubtotal(
    linhas.map((l) => ({ precoUnitarioCentavos: l.prato.precoVendaCentavos, quantidade: l.quantidade }))
  );
  const zonaEscolhida = bairros.find((b) => b.bairro === bairro) ?? null;
  const freteBase = resolverFrete(zonaEscolhida, subtotal);
  const cupomValido = cupom?.ok ? cupom : null;
  const frete = cupomValido?.freteGratis ? 0 : freteBase;
  const desconto = cupomValido?.descontoCentavos ?? 0;
  const total = calcularTotal(subtotal, frete, desconto);
  const falta = faltaParaMinimo(subtotal);

  const itensJson = JSON.stringify(itens);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  if (!carregado) return <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />;

  if (linhas.length === 0) {
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
      {cupomValido ? <input type="hidden" name="cupom" value={cupomValido.codigo} /> : null}

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Seus dados</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" required autoComplete="name" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="telefone">WhatsApp</Label>
              <Input id="telefone" name="telefone" required inputMode="tel" autoComplete="tel" placeholder="(82) 99999-9999" />
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

          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums text-foreground">{formatarCentavos(subtotal)}</dd>
            </div>
            {desconto > 0 ? (
              <div className="flex justify-between text-success">
                <dt>Desconto ({cupomValido?.codigo})</dt>
                <dd className="tabular-nums">− {formatarCentavos(desconto)}</dd>
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
            <p className="mt-4 rounded-md bg-warning/10 p-2 text-xs text-warning-foreground">
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
