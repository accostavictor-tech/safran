"use client";

import { useActionState, startTransition } from "react";
import { Check } from "lucide-react";
import { salvarPerfilAction, type PerfilState } from "@/actions/conta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PerfilForm({ nome, email }: { nome: string; email: string | null }) {
  const [state, formAction, pendente] = useActionState<PerfilState, FormData>(salvarPerfilAction, {});

  // Disparo manual pelo mesmo motivo do formulário de prato: o React reseta o
  // form quando a action termina, e num erro de validação isso apagaria o que
  // a pessoa acabou de digitar.
  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    startTransition(() => formAction(dados));
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" name="nome" defaultValue={nome} required placeholder="Como quer ser chamado" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input id="email" name="email" type="email" defaultValue={email ?? ""} placeholder="voce@email.com" />
        </div>
      </div>

      {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar"}
        </Button>
        {state.ok && !pendente ? (
          <span className="flex items-center gap-1 text-sm text-on-success-soft">
            <Check className="size-4" />
            Salvo
          </span>
        ) : null}
      </div>
    </form>
  );
}
