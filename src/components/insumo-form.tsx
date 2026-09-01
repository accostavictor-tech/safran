"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { criarInsumoAction, atualizarInsumoAction, type InsumoFormState } from "@/actions/insumos";
import { Field, Input, Select, Button, Card } from "@/components/ui";
import type { insumos } from "@/db/schema";

type Insumo = typeof insumos.$inferSelect;

const initialState: InsumoFormState = {};

const MACRO_FIELDS: { name: keyof Insumo; label: string; unidade: string }[] = [
  { name: "energiaKcal", label: "Energia", unidade: "kcal" },
  { name: "carboidratos", label: "Carboidratos", unidade: "g" },
  { name: "acucaresTotais", label: "Açúcares totais", unidade: "g" },
  { name: "proteinas", label: "Proteínas", unidade: "g" },
  { name: "gordurasTotais", label: "Gorduras totais", unidade: "g" },
  { name: "gordurasSaturadas", label: "Gorduras saturadas", unidade: "g" },
  { name: "gordurasTrans", label: "Gorduras trans", unidade: "g" },
  { name: "fibraAlimentar", label: "Fibra alimentar", unidade: "g" },
  { name: "sodio", label: "Sódio", unidade: "mg" },
];

export function InsumoForm({ insumo }: { insumo?: Insumo }) {
  const router = useRouter();
  const action = insumo ? atualizarInsumoAction.bind(null, insumo.id) : criarInsumoAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Card className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-neutral-900">Dados básicos</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Nome" htmlFor="nome">
              <Input id="nome" name="nome" required defaultValue={insumo?.nome} placeholder="Ex: Peito de frango" />
            </Field>
          </div>

          <Field label="Unidade de medida" htmlFor="unidadeMedida">
            <Select id="unidadeMedida" name="unidadeMedida" defaultValue={insumo?.unidadeMedida ?? "g"}>
              <option value="g">Gramas (custo por 100g)</option>
              <option value="ml">Mililitros (custo por 100ml)</option>
              <option value="un">Unidade (custo por unidade)</option>
            </Select>
          </Field>

          <Field label="Custo (R$)" htmlFor="custo">
            <Input
              id="custo"
              name="custo"
              type="number"
              step="0.0001"
              min="0"
              required
              defaultValue={insumo?.custo}
            />
          </Field>

          <Field
            label="Fator de correção (FC)"
            htmlFor="fatorCorrecao"
            hint="Quanto comprar bruto pra render 1 de líquido. Sem perda = 1."
          >
            <Input
              id="fatorCorrecao"
              name="fatorCorrecao"
              type="number"
              step="0.001"
              min="0.01"
              required
              defaultValue={insumo?.fatorCorrecao ?? 1}
            />
          </Field>

          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="temGluten" defaultChecked={insumo?.temGluten} className="h-4 w-4 rounded border-neutral-300" />
              Contém glúten
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="temLactose" defaultChecked={insumo?.temLactose} className="h-4 w-4 rounded border-neutral-300" />
              Contém lactose
            </label>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Macronutrientes por 100g/100ml/unidade</h2>
          <p className="text-xs text-neutral-400">Opcional — usado para calcular a tabela nutricional dos pratos.</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {MACRO_FIELDS.map((f) => (
            <Field key={f.name} label={`${f.label} (${f.unidade})`} htmlFor={f.name}>
              <Input
                id={f.name}
                name={f.name}
                type="number"
                step="0.01"
                min="0"
                defaultValue={insumo?.[f.name] as number | undefined ?? undefined}
              />
            </Field>
          ))}
        </div>
      </Card>

      {state.erro ? <p className="text-sm text-red-600">{state.erro}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/insumos")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
