"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { criarInsumoAction, atualizarInsumoAction, type InsumoFormState } from "@/actions/insumos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
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
    <form action={formAction} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Dados básicos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" name="nome" required defaultValue={insumo?.nome} placeholder="Ex: Peito de frango" autoFocus />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unidadeMedida">Unidade de medida</Label>
              <Select name="unidadeMedida" defaultValue={insumo?.unidadeMedida ?? "g"}>
                <SelectTrigger id="unidadeMedida" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="g">Gramas (custo por 100g)</SelectItem>
                  <SelectItem value="ml">Mililitros (custo por 100ml)</SelectItem>
                  <SelectItem value="un">Unidade (custo por unidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custo">Custo (R$)</Label>
              <Input id="custo" name="custo" type="number" step="0.0001" min="0" required defaultValue={insumo?.custo} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fatorCorrecao">Fator de correção (FC)</Label>
              <Input
                id="fatorCorrecao"
                name="fatorCorrecao"
                type="number"
                step="0.001"
                min="0.01"
                required
                defaultValue={insumo?.fatorCorrecao ?? 1}
              />
              <p className="text-xs text-muted-foreground">Quanto comprar bruto pra render 1 de líquido. Sem perda = 1.</p>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox name="temGluten" defaultChecked={insumo?.temGluten} />
                Contém glúten
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox name="temLactose" defaultChecked={insumo?.temLactose} />
                Contém lactose
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Macronutrientes por 100g/100ml/unidade</CardTitle>
          <CardDescription>Opcional — usado para calcular a tabela nutricional dos pratos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {MACRO_FIELDS.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={f.name}>
                  {f.label} <span className="text-muted-foreground">({f.unidade})</span>
                </Label>
                <Input
                  id={f.name}
                  name={f.name}
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={(insumo?.[f.name] as number | undefined) ?? undefined}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {state.erro ? <p className="text-sm text-destructive">{state.erro}</p> : null}

      <div className="flex gap-3">
        <Button type="submit" loading={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/insumos")}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
