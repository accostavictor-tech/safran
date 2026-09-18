"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { criarSessao, encerrarSessao, verificarSenha } from "@/lib/auth";

export interface LoginState {
  erro?: string;
}

/**
 * Só aceita voltar para dentro do admin. Sem isso, `?de=` viraria um
 * redirecionamento aberto para qualquer URL.
 */
function destinoSeguro(de: string | null): string {
  if (!de) return "/admin";
  if (de.startsWith("/admin") && !de.startsWith("/admin//")) return de;
  return "/admin";
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const senha = String(formData.get("senha") ?? "");
  const destino = destinoSeguro(formData.get("de") ? String(formData.get("de")) : null);

  if (!email || !senha) {
    return { erro: "Informe email e senha." };
  }

  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1);

  if (!usuario || !(await verificarSenha(senha, usuario.senhaHash))) {
    return { erro: "Email ou senha incorretos." };
  }

  await criarSessao({ userId: usuario.id, nome: usuario.nome, email: usuario.email });
  redirect(destino);
}

export async function logoutAction() {
  await encerrarSessao();
  redirect("/login");
}
