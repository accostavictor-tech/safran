"use client";

import { useActionState, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { criarCupomAction, atualizarCupomAction, type CupomFormState } from "@/actions/cupons-admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { centavosParaReais } from "@/lib/calculations";
import { normalizarCodigoCupom } from "@/lib/cupom";
import type { Cupom } from "@/db/queries/cupons";

const initialState: CupomFormState = {};

function paraInputDate(d: Date | null): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

export function CupomForm({ cupom }: { cupom?: Cupom }) {
  const router = useRouter();
  const action = cupom ? atualizarCupomAction.bind(null, cupom.id) : criarCupomAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [tipo, setTipo] = useState(cupom?.tipo ?? "percentual");

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form onSubmit={enviar} className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Cupom</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input
              id="codigo"
              name="codigo"
              required
              defaultValue={cupom?.codigo}
              placeholder="PRIMEIRACOMPRA"
              className="font-mono uppercase"
              onChange={(e) => {
                e.target.value = normalizarCodigoCupom(e.target.value);
              }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">É o que o cliente digita. Sem espaço, sempre maiúsculo.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo de desconto</Label>
            <Select name="tipo" value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
              <SelectTrigger id="tipo" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentual">Percentual</SelectItem>
                <SelectItem value="fixo">Valor fixo</SelectItem>
                <SelectItem value="frete_gratis">Frete grátis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {tipo === "percentual" ? (
            <div className="space-y-1.5">
              <Label htmlFor="valorPercentual">Desconto (%)</Label>
              <Input
                id="valorPercentual"
                name="valorPercentual"
                type="number"
                step="0.01"
                min="1"
                max="100"
                defaultValue={cupom?.valorPercentual ?? ""}
              />
            </div>
          ) : null}

          {tipo === "fixo" ? (
            <div className="space-y-1.5">
              <Label htmlFor="valorReais">Desconto (R$)</Label>
              <Input
                id="valorReais"
                name="valorReais"
                type="number"
                step="0.01"
                min="0.01"
                defaultValue={cupom?.valorCentavos != null ? centavosParaReais(cupom.valorCentavos) : ""}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="minimoReais">Pedido mínimo (R$)</Label>
            <Input
              id="minimoReais"
              name="minimoReais"
              type="number"
              step="0.01"
              min="0"
              defaultValue={cupom?.minimoCentavos ? centavosParaReais(cupom.minimoCentavos) : ""}
              placeholder="sem mínimo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="validadeFim">Válido até</Label>
            <Input id="validadeFim" name="validadeFim" type="date" defaultValue={paraInputDate(cupom?.validadeFim ?? null)} />
            <p className="text-xs text-muted-foreground">Vazio = sem prazo.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="limiteTotal">Limite de usos no total</Label>
            <Input
              id="limiteTotal"
              name="limiteTotal"
              type="number"
              min="1"
              step="1"
              defaultValue={cupom?.limiteTotal ?? ""}
              placeholder="ilimitado"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="limitePorCliente">Usos por cliente</Label>
            <Input
              id="limitePorCliente"
              name="limitePorCliente"
              type="number"
              min="1"
              max="99"
              step="1"
              defaultValue={cupom?.limitePorCliente ?? 1}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="primeiraCompraApenas" defaultChecked={cupom?.primeiraCompraApenas ?? false} />
              Só para a primeira compra do cliente
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox name="ativo" defaultChecked={cupom?.ativo ?? true} />
              Cupom ativo
            </label>
          </div>
        </CardContent>
      </Card>

      {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/cupons")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
