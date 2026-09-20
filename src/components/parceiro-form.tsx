"use client";

import Link from "next/link";
import { useActionState, startTransition, useState } from "react";
import { salvarParceiroAction, type ParceiroFormState } from "@/actions/parceiros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculations";
import {
  normalizarCodigoParceiro,
  TIPO_PARCEIRO_DESCRICAO,
  TIPO_PARCEIRO_LABEL,
  type TipoParceiro,
} from "@/lib/parceiros";

export interface ParceiroParaFormulario {
  id: string;
  tipo: TipoParceiro;
  nome: string;
  contatoNome: string | null;
  telefone: string | null;
  email: string | null;
  documento: string | null;
  codigoIndicacao: string;
  descontoPct: number;
  comissaoPct: number;
  observacoes: string | null;
  ativo: boolean;
}

const TIPOS: TipoParceiro[] = ["empresa", "afiliado", "nutricionista"];

/** Pedido de referência para a simulação. É o ticket médio arredondado. */
const PEDIDO_EXEMPLO_REAIS = 250;

export function ParceiroForm({ parceiro }: { parceiro?: ParceiroParaFormulario }) {
  const [state, formAction, pendente] = useActionState<ParceiroFormState, FormData>(
    salvarParceiroAction.bind(null, parceiro?.id ?? null),
    {}
  );

  const [tipo, setTipo] = useState<TipoParceiro>(parceiro?.tipo ?? "afiliado");
  const [codigo, setCodigo] = useState(parceiro?.codigoIndicacao ?? "");
  const [descontoPct, setDescontoPct] = useState(parceiro?.descontoPct ?? 0);
  const [comissaoPct, setComissaoPct] = useState(parceiro?.comissaoPct ?? 0);
  const [ativo, setAtivo] = useState(parceiro?.ativo ?? true);

  // Mesma conta do servidor: comissão sobre o subtotal já descontado.
  const desconto = (PEDIDO_EXEMPLO_REAIS * descontoPct) / 100;
  const recebido = PEDIDO_EXEMPLO_REAIS - desconto;
  const comissao = (recebido * comissaoPct) / 100;

  // Disparo manual: o React reseta o form depois da action, e o reset
  // desmarcaria a caixa "ativo" do Radix sem ninguém perceber.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <input type="hidden" name="tipo" value={tipo} />

      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Tipo de parceria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {TIPOS.map((t) => (
              <label
                key={t}
                className={
                  tipo === t
                    ? "flex cursor-pointer items-start gap-2.5 rounded-lg border border-primary bg-primary-soft px-3 py-2.5"
                    : "flex cursor-pointer items-start gap-2.5 rounded-lg border border-border px-3 py-2.5 transition hover:border-primary/40"
                }
              >
                <input
                  type="radio"
                  name="tipoEscolhido"
                  checked={tipo === t}
                  onChange={() => setTipo(t)}
                  className="mt-0.5 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{TIPO_PARCEIRO_LABEL[t]}</span>
                  <span className="block text-xs text-muted-foreground">{TIPO_PARCEIRO_DESCRICAO[t]}</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" name="nome" required defaultValue={parceiro?.nome} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="codigoIndicacao">Código de indicação</Label>
                <Input
                  id="codigoIndicacao"
                  name="codigoIndicacao"
                  required
                  value={codigo}
                  onChange={(e) => setCodigo(normalizarCodigoParceiro(e.target.value))}
                  placeholder="ACADEMIA-X"
                  className="font-mono uppercase"
                />
                <p className="text-xs text-muted-foreground">É o que o cliente digita no checkout.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contatoNome">Pessoa de contato</Label>
                <Input id="contatoNome" name="contatoNome" defaultValue={parceiro?.contatoNome ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="documento">CNPJ ou CPF</Label>
                <Input id="documento" name="documento" defaultValue={parceiro?.documento ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">WhatsApp</Label>
                <Input id="telefone" name="telefone" defaultValue={parceiro?.telefone ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={parceiro?.email ?? ""} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" rows={2} defaultValue={parceiro?.observacoes ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Condições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="descontoPct">Desconto ao cliente (%)</Label>
                <Input
                  id="descontoPct"
                  name="descontoPct"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={descontoPct}
                  onChange={(e) => setDescontoPct(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Sai do que o cliente paga. É a tabela da empresa.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="comissaoPct">Comissão ao parceiro (%)</Label>
                <Input
                  id="comissaoPct"
                  name="comissaoPct"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={comissaoPct}
                  onChange={(e) => setComissaoPct(Number(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">Despesa da Safran. Não muda o total do cliente.</p>
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox name="ativo" checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
              <span>
                Parceiro ativo
                <span className="block text-xs text-muted-foreground">
                  Desmarcar faz o código parar de valer no checkout, sem apagar o histórico.
                </span>
              </span>
            </label>
          </CardContent>
        </Card>

        {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar parceiro"}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/parceiros">Cancelar</Link>
          </Button>
        </div>
      </div>

      <Card className="lg:sticky lg:top-6 lg:self-start">
        <CardHeader>
          <CardTitle>Num pedido de {formatarMoeda(PEDIDO_EXEMPLO_REAIS)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cliente paga</span>
            <span className="font-medium tabular-nums text-foreground">{formatarMoeda(recebido)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Comissão a pagar</span>
            <span className="font-medium tabular-nums text-foreground">{formatarMoeda(comissao)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-medium text-foreground">Sobra para a Safran</span>
            <span className="font-semibold tabular-nums text-foreground">{formatarMoeda(recebido - comissao)}</span>
          </div>
          <p className="pt-2 text-xs leading-5 text-muted-foreground">
            Isso é antes do custo do prato e da entrega. Com margem de contribuição de 45%, desconto e comissão
            somados acima de 45% vendem no prejuízo.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
