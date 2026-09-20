"use client";

import { useSyncExternalStore } from "react";
import type { ItemCarrinho, KitCarrinho } from "@/lib/loja";

// Carrinho como store de módulo em vez de estado em contexto: é o que
// useSyncExternalStore espera, evita render extra na hidratação e deixa
// qualquer componente ler o carrinho sem precisar de provider em volta.

const CHAVE = "safran_carrinho_v1";

export interface EstadoCarrinho {
  itens: ItemCarrinho[];
  kits: KitCarrinho[];
  /** false até o storage do navegador ter sido lido. */
  carregado: boolean;
}

const VAZIO: ItemCarrinho[] = [];
const SEM_KITS: KitCarrinho[] = [];

/**
 * O mesmo objeto serve de snapshot no servidor e no primeiro render do cliente,
 * então a hidratação compara referências idênticas.
 */
const ESTADO_INICIAL: EstadoCarrinho = { itens: VAZIO, kits: SEM_KITS, carregado: false };

let estado: EstadoCarrinho = ESTADO_INICIAL;
const ouvintes = new Set<() => void>();

function publicar(itens: ItemCarrinho[], kits: KitCarrinho[]) {
  estado = { itens, kits, carregado: true };
  for (const ouvinte of ouvintes) ouvinte();
}

function itensValidos(bruto: unknown): ItemCarrinho[] {
  if (!Array.isArray(bruto)) return VAZIO;
  return bruto.filter(
    (i): i is ItemCarrinho =>
      typeof i?.pratoId === "string" && Number.isInteger(i?.quantidade) && i.quantidade > 0
  );
}

function kitsValidos(bruto: unknown): KitCarrinho[] {
  if (!Array.isArray(bruto)) return SEM_KITS;
  return bruto.filter(
    (k): k is KitCarrinho =>
      typeof k?.uid === "string" &&
      typeof k?.kitId === "string" &&
      Array.isArray(k?.pratoIds) &&
      k.pratoIds.every((id: unknown) => typeof id === "string") &&
      Number.isInteger(k?.quantidade) &&
      k.quantidade > 0
  );
}

function ler(): { itens: ItemCarrinho[]; kits: KitCarrinho[] } {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (!bruto) return { itens: VAZIO, kits: SEM_KITS };
    const parsed = JSON.parse(bruto);
    // Um array cru é o formato antigo, de antes dos kits: continua valendo como
    // lista de pratos, para ninguém perder o carrinho numa atualização.
    if (Array.isArray(parsed)) return { itens: itensValidos(parsed), kits: SEM_KITS };
    return { itens: itensValidos(parsed?.itens), kits: kitsValidos(parsed?.kits) };
  } catch {
    // Aba privada, storage bloqueado ou conteúdo corrompido.
    return { itens: VAZIO, kits: SEM_KITS };
  }
}

function gravarEPublicar(itens: ItemCarrinho[], kits: KitCarrinho[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ itens, kits }));
  } catch {
    // Sem storage o carrinho vale só para esta navegação.
  }
  publicar(itens, kits);
}

function assinar(ouvinte: () => void) {
  // A primeira assinatura roda depois da hidratação, então é aqui que o
  // conteúdo do storage entra sem arriscar divergir do HTML do servidor.
  if (!estado.carregado) {
    const lido = ler();
    publicar(lido.itens, lido.kits);
  }

  ouvintes.add(ouvinte);

  const aoMudarStorage = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      const lido = ler();
      publicar(lido.itens, lido.kits);
    }
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

/** Quantas unidades o carrinho tem ao todo, contando kits como uma unidade cada. */
export function totalDeUnidades(estadoAtual: EstadoCarrinho): number {
  const pratos = estadoAtual.itens.reduce((acc, i) => acc + i.quantidade, 0);
  const kits = estadoAtual.kits.reduce((acc, k) => acc + k.quantidade, 0);
  return pratos + kits;
}

export function adicionar(pratoId: string, quantidade = 1) {
  const existente = estado.itens.find((i) => i.pratoId === pratoId);
  gravarEPublicar(
    existente
      ? estado.itens.map((i) => (i.pratoId === pratoId ? { ...i, quantidade: i.quantidade + quantidade } : i))
      : [...estado.itens, { pratoId, quantidade }],
    estado.kits
  );
}

export function definirQuantidade(pratoId: string, quantidade: number) {
  if (quantidade <= 0) {
    remover(pratoId);
    return;
  }
  gravarEPublicar(
    estado.itens.map((i) => (i.pratoId === pratoId ? { ...i, quantidade } : i)),
    estado.kits
  );
}

export function remover(pratoId: string) {
  gravarEPublicar(
    estado.itens.filter((i) => i.pratoId !== pratoId),
    estado.kits
  );
}

/** Adiciona uma montagem de kit. Montagens iguais do mesmo kit somam quantidade. */
export function adicionarKit(kitId: string, pratoIds: string[]) {
  const assinatura = (k: { kitId: string; pratoIds: string[] }) =>
    `${k.kitId}|${[...k.pratoIds].sort().join(",")}`;
  const alvo = assinatura({ kitId, pratoIds });
  const existente = estado.kits.find((k) => assinatura(k) === alvo);

  gravarEPublicar(
    estado.itens,
    existente
      ? estado.kits.map((k) => (k.uid === existente.uid ? { ...k, quantidade: k.quantidade + 1 } : k))
      : [...estado.kits, { uid: crypto.randomUUID(), kitId, pratoIds, quantidade: 1 }]
  );
}

export function definirQuantidadeKit(uid: string, quantidade: number) {
  if (quantidade <= 0) {
    removerKit(uid);
    return;
  }
  gravarEPublicar(
    estado.itens,
    estado.kits.map((k) => (k.uid === uid ? { ...k, quantidade } : k))
  );
}

export function removerKit(uid: string) {
  gravarEPublicar(
    estado.itens,
    estado.kits.filter((k) => k.uid !== uid)
  );
}

export function limpar() {
  gravarEPublicar(VAZIO, SEM_KITS);
}
