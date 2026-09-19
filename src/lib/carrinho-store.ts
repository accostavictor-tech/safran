"use client";

import { useSyncExternalStore } from "react";
import type { ItemCarrinho } from "@/lib/loja";

// Carrinho como store de módulo em vez de estado em contexto: é o que
// useSyncExternalStore espera, evita render extra na hidratação e deixa
// qualquer componente ler o carrinho sem precisar de provider em volta.

const CHAVE = "safran_carrinho_v1";

export interface EstadoCarrinho {
  itens: ItemCarrinho[];
  /** false até o storage do navegador ter sido lido. */
  carregado: boolean;
}

const VAZIO: ItemCarrinho[] = [];

/**
 * O mesmo objeto serve de snapshot no servidor e no primeiro render do cliente,
 * então a hidratação compara referências idênticas.
 */
const ESTADO_INICIAL: EstadoCarrinho = { itens: VAZIO, carregado: false };

let estado: EstadoCarrinho = ESTADO_INICIAL;
const ouvintes = new Set<() => void>();

function publicar(itens: ItemCarrinho[]) {
  estado = { itens, carregado: true };
  for (const ouvinte of ouvintes) ouvinte();
}

function ler(): ItemCarrinho[] {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return VAZIO;
    const parsed = JSON.parse(bruto);
    if (!Array.isArray(parsed)) return VAZIO;
    return parsed.filter(
      (i): i is ItemCarrinho =>
        typeof i?.pratoId === "string" && Number.isInteger(i?.quantidade) && i.quantidade > 0
    );
  } catch {
    // Aba privada, storage bloqueado ou conteúdo corrompido.
    return VAZIO;
  }
}

function gravarEPublicar(itens: ItemCarrinho[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(itens));
  } catch {
    // Sem storage o carrinho vale só para esta navegação.
  }
  publicar(itens);
}

function assinar(ouvinte: () => void) {
  // A primeira assinatura roda depois da hidratação, então é aqui que o
  // conteúdo do storage entra sem arriscar divergir do HTML do servidor.
  if (!estado.carregado) publicar(ler());

  ouvintes.add(ouvinte);

  const aoMudarStorage = (e: StorageEvent) => {
    if (e.key === CHAVE) publicar(ler());
  };
  window.addEventListener("storage", aoMudarStorage);

  return () => {
    ouvintes.delete(ouvinte);
    window.removeEventListener("storage", aoMudarStorage);
  };
}

const snapshot = () => estado;
const snapshotServidor = () => ESTADO_INICIAL;

export function useCarrinho(): EstadoCarrinho {
  return useSyncExternalStore(assinar, snapshot, snapshotServidor);
}

export function adicionar(pratoId: string, quantidade = 1) {
  const existente = estado.itens.find((i) => i.pratoId === pratoId);
  gravarEPublicar(
    existente
      ? estado.itens.map((i) => (i.pratoId === pratoId ? { ...i, quantidade: i.quantidade + quantidade } : i))
      : [...estado.itens, { pratoId, quantidade }]
  );
}

export function definirQuantidade(pratoId: string, quantidade: number) {
  if (quantidade <= 0) {
    remover(pratoId);
    return;
  }
  gravarEPublicar(estado.itens.map((i) => (i.pratoId === pratoId ? { ...i, quantidade } : i)));
}

export function remover(pratoId: string) {
  gravarEPublicar(estado.itens.filter((i) => i.pratoId !== pratoId));
}

export function limpar() {
  gravarEPublicar(VAZIO);
}
