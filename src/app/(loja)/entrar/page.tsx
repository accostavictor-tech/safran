import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obterSessaoCliente } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { EntrarForm } from "@/components/entrar-form";

export const metadata: Metadata = { title: "Entrar — Safran Congelados" };

export default async function EntrarPage() {
  if (await obterSessaoCliente()) redirect("/minha-conta");

  return (
    <div className="mx-auto max-w-sm px-4 py-12 sm:px-6">
      <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground">Entrar</h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        Acompanhe seus pedidos e use seu cashback.
      </p>
      <Card className="mt-6">
        <CardContent className="pt-5">
          <EntrarForm />
        </CardContent>
      </Card>
    </div>
  );
}
