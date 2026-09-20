import type { Metadata } from "next";
import { listarKitsVitrine, listarPratosVitrine } from "@/db/queries/loja";
import { Carrinho } from "@/components/carrinho";

export const metadata: Metadata = { title: "Carrinho — Safran Congelados" };

export default async function CarrinhoPage() {
  // O carrinho vive no navegador guardando só prato e quantidade. O catálogo
  // vem daqui, então o preço exibido é sempre o do servidor.
  const [pratos, kits] = await Promise.all([listarPratosVitrine(), listarKitsVitrine()]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Seu carrinho</h1>
      <Carrinho pratos={pratos} kits={kits} />
    </div>
  );
}
