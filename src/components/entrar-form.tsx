"use client";

import { useActionState, useState, startTransition } from "react";
import { MessageCircle } from "lucide-react";
import { solicitarCodigoAction, confirmarCodigoAction, type EntrarState } from "@/actions/conta";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatarTelefone } from "@/lib/loja";

const inicial: EntrarState = {};

export function EntrarForm() {
  const [etapa, setEtapa] = useState<"telefone" | "codigo">("telefone");
  const [telefone, setTelefone] = useState("");
  const [aviso, setAviso] = useState<string | undefined>();

  const [estadoPedido, pedirCodigo, pedindo] = useActionState(
    async (prev: EntrarState, dados: FormData) => {
      const r = await solicitarCodigoAction(prev, dados);
      if (!r.erro && r.telefone) {
        setTelefone(r.telefone);
        setAviso(r.aviso);
        setEtapa("codigo");
      }
      return r;
    },
    inicial
  );

  const [estadoConfirma, confirmar, confirmando] = useActionState(confirmarCodigoAction, inicial);

  function enviar(acao: (d: FormData) => void) {
    return (evento: React.FormEvent<HTMLFormElement>) => {
      evento.preventDefault();
      const dados = new FormData(evento.currentTarget);
      startTransition(() => acao(dados));
    };
  }

  if (etapa === "telefone") {
    return (
      <form onSubmit={enviar(pedirCodigo)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="telefone">Seu WhatsApp</Label>
          <Input
            id="telefone"
            name="telefone"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="(82) 99999-9999"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">Enviamos um código de 6 dígitos para confirmar que é você.</p>
        </div>

        {estadoPedido.erro ? <p className="text-sm text-destructive">{estadoPedido.erro}</p> : null}

        <Button type="submit" loading={pedindo} className="h-11 w-full">
          {pedindo ? "Enviando..." : "Receber código"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={enviar(confirmar)} className="space-y-4">
      <input type="hidden" name="telefone" value={telefone} />

      <p className="flex items-start gap-2 rounded-md bg-primary/5 p-3 text-sm text-foreground">
        <MessageCircle className="size-4 shrink-0 translate-y-0.5 text-primary" />
        <span>
          Código enviado para <strong>{formatarTelefone(telefone)}</strong>.
        </span>
      </p>

      {aviso ? <p className="rounded-md bg-warning-soft p-3 text-xs text-on-warning-soft">{aviso}</p> : null}

      <div className="space-y-1.5">
        <Label htmlFor="codigo">Código de 6 dígitos</Label>
        <Input
          id="codigo"
          name="codigo"
          required
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          className="text-center font-mono text-lg tracking-[0.3em]"
          autoFocus
        />
      </div>

      {estadoConfirma.erro ? <p className="text-sm text-destructive">{estadoConfirma.erro}</p> : null}

      <Button type="submit" loading={confirmando} className="h-11 w-full">
        {confirmando ? "Confirmando..." : "Entrar"}
      </Button>

      <button
        type="button"
        onClick={() => setEtapa("telefone")}
        className="w-full text-center text-sm text-muted-foreground underline hover:text-foreground"
      >
        Usar outro número
      </button>
    </form>
  );
}
