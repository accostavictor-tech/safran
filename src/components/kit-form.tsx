"use client";

import Link from "next/link";
import { useActionState, startTransition, useState } from "react";
import { salvarKitAction, type KitFormState } from "@/actions/kits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/calculations";

export interface KitParaFormulario {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  quantidadePratos: number;
  precoCentavos: number;
  ordem: number;
  publicado: boolean;
  ativo: boolean;
}

export function KitForm({ kit }: { kit?: KitParaFormulario }) {
  const [state, formAction, pendente] = useActionState<KitFormState, FormData>(
    salvarKitAction.bind(null, kit?.id ?? null),
    {}
  );

  const [quantidadePratos, setQuantidadePratos] = useState(kit?.quantidadePratos ?? 5);
  const [precoReais, setPrecoReais] = useState(
    kit ? String((kit.precoCentavos / 100).toFixed(2)) : ""
  );
  const [publicado, setPublicado] = useState(kit?.publicado ?? false);
  const [ativo, setAtivo] = useState(kit?.ativo ?? true);

  const preco = Number(precoReais.replace(",", "."));
  const porPrato = Number.isFinite(preco) && quantidadePratos > 0 ? preco / quantidadePratos : 0;

  // Disparo manual: o React reseta o form depois da action, e o reset
  // desmarcava as caixas do Radix — o kit era salvo despublicado sem aviso.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form onSubmit={enviar} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados do kit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required defaultValue={kit?.nome} placeholder="Semana Safran" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Endereço na loja</Label>
              <Input id="slug" name="slug" defaultValue={kit?.slug} placeholder="semana-safran" />
              <p className="text-xs text-muted-foreground">Vazio = gerado do nome automaticamente.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                name="descricao"
                rows={2}
                defaultValue={kit?.descricao ?? ""}
                placeholder="Escolha 5 pratos do cardápio e receba em casa."
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantidadePratos">Quantos pratos</Label>
                <Input
                  id="quantidadePratos"
                  name="quantidadePratos"
                  type="number"
                  min="2"
                  required
                  value={quantidadePratos}
                  onChange={(e) => setQuantidadePratos(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="precoReais">Preço do kit (R$)</Label>
                <Input
                  id="precoReais"
                  name="precoReais"
                  type="text"
                  inputMode="decimal"
                  required
                  value={precoReais}
                  onChange={(e) => setPrecoReais(e.target.value)}
                  placeholder="139,90"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ordem">Ordem na loja</Label>
                <Input id="ordem" name="ordem" type="number" min="0" defaultValue={kit?.ordem ?? 0} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publicação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox name="publicado" checked={publicado} onCheckedChange={(v) => setPublicado(v === true)} />
              <span>
                Publicado na loja
                <span className="block text-xs text-muted-foreground">Visível para o cliente montar.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-foreground">
              <Checkbox name="ativo" checked={ativo} onCheckedChange={(v) => setAtivo(v === true)} />
              <span>
                Kit ativo
                <span className="block text-xs text-muted-foreground">Desmarcar tira da loja sem excluir.</span>
              </span>
            </label>
          </CardContent>
        </Card>

        {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

        <div className="flex gap-3">
          <Button type="submit" disabled={pendente}>
            {pendente ? "Salvando…" : "Salvar kit"}
          </Button>
          <Button asChild variant="secondary">
            <Link href="/admin/kits">Cancelar</Link>
          </Button>
        </div>
      </div>

      <Card className="lg:sticky lg:top-6 lg:self-start">
        <CardHeader>
          <CardTitle>Como o preço funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Preço por prato</span>
            <span className="font-medium tabular-nums text-foreground">{formatarMoeda(porPrato)}</span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Prato cujo preço de venda passa desse valor entra no kit com a diferença como adicional, cobrada do
            cliente. É o que impede um kit de cinco camarões de sair abaixo do custo — não é preciso restringir
            quais pratos podem entrar.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
