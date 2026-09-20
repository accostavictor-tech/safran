"use client";

import { useActionState, startTransition, useState } from "react";
import { Plus, X } from "lucide-react";
import { salvarEnderecoAction, type EnderecoState } from "@/actions/conta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Novo endereço na agenda do cliente.
 *
 * Os bairros atendidos vêm prontos do servidor e viram uma lista de sugestão:
 * digitar "Jatiuca" sem acento continua valendo (a zona é resolvida sem acento
 * no servidor), mas a lista evita a frustração de descobrir só ao salvar que o
 * bairro não é atendido.
 */
export function EnderecoForm({ bairros }: { bairros: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [state, formAction, pendente] = useActionState<EnderecoState, FormData>(salvarEnderecoAction, {});
  const [tratado, setTratado] = useState<EnderecoState | null>(null);

  // Fecha sozinho quando salva. Compara a identidade do estado, e não um
  // booleano: cada retorno da action é um objeto novo, então isto dispara uma
  // vez por salvamento em vez de a cada render.
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
      <Button type="button" variant="secondary" size="sm" onClick={() => setAberto(true)}>
        <Plus className="size-4" />
        Novo endereço
      </Button>
    );
  }

  return (
    <form onSubmit={enviar} className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">Novo endereço</p>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-muted-foreground transition hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="size-4" />
        </button>
      </div>

      <datalist id="bairros-atendidos">
        {bairros.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-6">
        <div className="space-y-1.5 sm:col-span-4">
          <Label htmlFor="logradouro">Rua</Label>
          <Input id="logradouro" name="logradouro" required />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="numero">Número</Label>
          <Input id="numero" name="numero" required />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="complemento">Complemento</Label>
          <Input id="complemento" name="complemento" placeholder="Apto, bloco" />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="bairro">Bairro</Label>
          <Input id="bairro" name="bairro" list="bairros-atendidos" required />
        </div>
        <div className="space-y-1.5 sm:col-span-6">
          <Label htmlFor="referencia">Ponto de referência</Label>
          <Input id="referencia" name="referencia" placeholder="Portão verde, ao lado da padaria" />
        </div>
      </div>

      {state.erro ? <p className="mt-3 text-sm text-destructive">{state.erro}</p> : null}

      <Button type="submit" size="sm" className="mt-3" disabled={pendente}>
        {pendente ? "Salvando…" : "Salvar endereço"}
      </Button>
    </form>
  );
}
