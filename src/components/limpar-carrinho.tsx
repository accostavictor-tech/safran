"use client";

import { useEffect } from "react";
import { limpar } from "@/lib/carrinho-store";

/** Esvazia o carrinho ao abrir a confirmação, já que o pedido virou registro. */
export function LimparCarrinho() {
  useEffect(() => {
    limpar();
  }, []);

  return null;
}
