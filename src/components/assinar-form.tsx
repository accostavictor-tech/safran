"use client";

import Link from "next/link";
import { useActionState, startTransition, useState } from "react";
import { CalendarClock, MapPin } from "lucide-react";
import { criarAssinaturaAction, type AssinaturaState } from "@/actions/assinaturas";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { MontarKit } from "@/components/montar-kit";
import { formatarCentavos } from "@/lib/calculations";
import { FREQUENCIA_LABEL, type Frequencia } from "@/lib/assinaturas";
import { formatarEndereco } from "@/lib/enderecos";
import type { KitVitrine, PratoVitrine } from "@/lib/vitrine";

export interface EnderecoOpcao {
  id: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  padrao: boolean;
  atendido: boolean;
}

const FREQUENCIAS: Frequencia[] = ["semanal", "quinzenal", "mensal"];

export function AssinarForm({
  kit,
  pratos,
  enderecos,
}: {
  kit: KitVitrine;
  pratos: PratoVitrine[];
  enderecos: EnderecoOpcao[];
}) {
  const [state, formAction, pendente] = useActionState<AssinaturaState, FormData>(criarAssinaturaAction, {});
  const [frequencia, setFrequencia] = useState<Frequencia>("semanal");
  const atendidos = enderecos.filter((e) => e.atendido);
  const [enderecoId, setEnderecoId] = useState(
    atendidos.find((e) => e.padrao)?.id ?? atendidos[0]?.id ?? ""
  );

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  if (atendidos.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-5">
          <p className="font-medium text-foreground">Falta um endereço de entrega</p>
          <p className="mt-1 text-sm text-muted-foreground">
            A assinatura entrega sempre no mesmo lugar, então precisa de um endereço salvo num bairro que a gente
            atende.
          </p>
          <Button asChild className="mt-4">
            <Link href="/minha-conta">Cadastrar endereço</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={enviar}>
      <input type="hidden" name="kitId" value={kit.id} />
      <input type="hidden" name="frequencia" value={frequencia} />
      <input type="hidden" name="enderecoId" value={enderecoId} />

      <Card className="mt-6">
        <CardContent className="space-y-5 pt-5">
          <div>
            <Label className="flex items-center gap-1.5">
              <CalendarClock className="size-4 text-primary" />
              Com que frequência
            </Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FREQUENCIAS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequencia(f)}
                  aria-pressed={frequencia === f}
                  className={
                    frequencia === f
                      ? "rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                      : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40"
                  }
                >
                  {FREQUENCIA_LABEL[f]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="size-4 text-primary" />
              Entregar em
            </Label>
            <div className="mt-2 space-y-2">
              {atendidos.map((e) => (
                <label
                  key={e.id}
                  className={
                    enderecoId === e.id
                      ? "flex cursor-pointer items-center gap-2.5 rounded-lg border border-primary bg-primary-soft px-3 py-2.5 text-sm"
                      : "flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm transition hover:border-primary/40"
                  }
                >
                  <input
                    type="radio"
                    name="enderecoEscolhido"
                    checked={enderecoId === e.id}
                    onChange={() => setEnderecoId(e.id)}
                    className="accent-primary"
                  />
                  <span className="text-foreground">{formatarEndereco(e)}</span>
                </label>
              ))}
            </div>
            {enderecos.length > atendidos.length ? (
              <p className="mt-2 text-xs text-on-warning-soft">
                Endereços em bairros fora das zonas de entrega não aparecem aqui.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Alguma observação para a cozinha?</Label>
            <Textarea id="observacoes" name="observacoes" rows={2} placeholder="Sem pimenta, por favor." />
          </div>
        </CardContent>
      </Card>

      <MontarKit
        kit={kit}
        pratos={pratos}
        acao={({ pratoIds, completo, totalCentavos }) => (
          <>
            <input type="hidden" name="composicao" value={JSON.stringify(pratoIds)} />
            <Button type="submit" disabled={!completo || pendente}>
              {pendente ? "Assinando…" : `Assinar ${formatarCentavos(totalCentavos)}`}
            </Button>
          </>
        )}
      />

      {state.erro ? <p className="mt-4 text-sm text-destructive">{state.erro}</p> : null}

      <p className="mt-4 text-xs text-muted-foreground">
        Você escolhe os pratos de cada entrega. Se não mexer, repetimos esta seleção. Dá para pausar ou cancelar
        quando quiser, e o pagamento continua sendo combinado no WhatsApp a cada entrega.
      </p>
    </form>
  );
}
