import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

const COOKIE_SOCIO = "safran_session";
const COOKIE_CLIENTE = "safran_cliente";

const DURACAO_SOCIO = 60 * 60 * 24 * 30; // 30 dias
// Cliente fica logado por muito mais tempo: quase toda a receita vem de quem
// repete a compra, e pedir código a cada visita custaria uma mensagem e uma
// desistência.
const DURACAO_CLIENTE = 60 * 60 * 24 * 90; // 90 dias

/**
 * Audiência separada por tipo de sessão. Sem isso, um token de cliente —
 * assinado com o mesmo segredo — passaria pela verificação que protege o
 * /admin, porque validar assinatura não é o mesmo que validar permissão.
 */
const AUD_SOCIO = "socio";
const AUD_CLIENTE = "cliente";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET não configurada");
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  nome: string;
  email: string;
}

export interface SessaoCliente {
  clienteId: string;
  telefone: string;
  nome: string;
}

export async function hashPassword(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

async function assinar(dados: Record<string, string>, audiencia: string, duracao: number) {
  return new SignJWT(dados)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setAudience(audiencia)
    .setExpirationTime(`${duracao}s`)
    .sign(getSecret());
}

async function gravarCookie(nome: string, token: string, duracao: number) {
  const cookieStore = await cookies();
  cookieStore.set(nome, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: duracao,
  });
}

// --- Sócios (admin) ---

export async function criarSessao(payload: SessionPayload) {
  const token = await assinar({ ...payload }, AUD_SOCIO, DURACAO_SOCIO);
  await gravarCookie(COOKIE_SOCIO, token, DURACAO_SOCIO);
}

export async function encerrarSessao() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SOCIO);
}

export async function obterSessao(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SOCIO)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUD_SOCIO });
    return {
      userId: payload.userId as string,
      nome: payload.nome as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

/** Usada pelo proxy para guardar o /admin. Só aceita token de sócio. */
export async function verificarToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret(), { audience: AUD_SOCIO });
    return true;
  } catch {
    return false;
  }
}

// --- Clientes (loja) ---

export async function criarSessaoCliente(dados: SessaoCliente) {
  const token = await assinar({ ...dados }, AUD_CLIENTE, DURACAO_CLIENTE);
  await gravarCookie(COOKIE_CLIENTE, token, DURACAO_CLIENTE);
}

export async function encerrarSessaoCliente() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_CLIENTE);
}

export async function obterSessaoCliente(): Promise<SessaoCliente | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_CLIENTE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), { audience: AUD_CLIENTE });
    return {
      clienteId: payload.clienteId as string,
      telefone: payload.telefone as string,
      nome: payload.nome as string,
    };
  } catch {
    return null;
  }
}

export { COOKIE_SOCIO as COOKIE_NAME, COOKIE_CLIENTE };
