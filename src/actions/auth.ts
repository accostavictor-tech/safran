"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { criarSessao, encerrarSessao, verificarSenha } from "@/lib/auth";

export interface LoginState {
  erro?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

  if (!usuario || !(await verificarSenha(senha, usuario.senhaHash))) {
    return { erro: "Email ou senha incorretos." };
  }

  await criarSessao({ userId: usuario.id, nome: usuario.nome, email: usuario.email });
  redirect("/");
}

export async function logoutAction() {
  await encerrarSessao();
  redirect("/login");
}
