"use client";

import { useActionState, startTransition, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { salvarComposicaoProximaAction, type ComposicaoState } from "@/actions/assinaturas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MontarKit } from "@/components/montar-kit";
import type { KitVitrine, PratoVitrine } from "@/lib/vitrine";

/**
 * Troca da composição do próximo ciclo.
 *
 * Fica fechado por padrão: a assinatura existe justamente para quem não quer
 * escolher toda semana, e abrir a lista inteira de pratos por cima do resumo
 * transformaria a tela de acompanhamento numa tela de compra.
 */
export function EditarComposicao({
  assinaturaId,
  kit,
  pratos,
  atual,
}: {
  assinaturaId: string;
  kit: KitVitrine;
  pratos: PratoVitrine[];
  atual: string[];
}) {
  const [aberto, setAberto] = useState(false);
  const [manterPadrao, setManterPadrao] = useState(false);
  const [state, formAction, pendente] = useActionState<ComposicaoState, FormData>(
    salvarComposicaoProximaAction.bind(null, assinaturaId),
    {}
  );
  const [tratado, setTratado] = useState<ComposicaoState | null>(null);

  // Fecha ao salvar. Compara a identidade do estado para disparar uma vez por
  // salvamento, e não a cada render.
  if (state.ok && !pendente && state !== tratado) {
    setTratado(state);
    setAberto(false);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  if (!aberto) {
    return (
      <div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setAberto(true)}>
          <Pencil className="size-3.5" />
          Trocar os pratos desta entrega
        </Button>
        {state.erro ? <p className="mt-2 text-sm text-destructive">{state.erro}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={enviar}>
      <MontarKit
        kit={kit}
        pratos={pratos}
        inicial={atual}
        acao={({ pratoIds, completo }) => (
          <>
            <input type="hidden" name="composicao" value={JSON.stringify(pratoIds)} />
            <Button type="submit" disabled={!completo || pendente}>
              <Check className="size-4" />
              {pendente ? "Salvando…" : "Salvar"}
            </Button>
          </>
        )}
      />

      <label className="mt-4 flex items-start gap-2 text-sm text-foreground">
        <Checkbox name="manterPadrao" checked={manterPadrao} onCheckedChange={(v) => setManterPadrao(v === true)} />
        <span>
          Repetir esta seleção nas próximas entregas
          <span className="block text-xs text-muted-foreground">
            Sem marcar, a troca vale só para a entrega mais próxima.
          </span>
        </span>
      </label>

      {state.erro ? <p className="mt-3 text-sm text-destructive">{state.erro}</p> : null}

      <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setAberto(false)}>
        Cancelar
      </Button>
    </form>
  );
}
