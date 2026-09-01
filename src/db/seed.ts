import { db } from "./index";
import { usuarios } from "./schema";
import { hashPassword } from "../lib/auth";
import { eq } from "drizzle-orm";

// Senha inicial padrão — trocar no primeiro acesso de cada sócio.
const SENHA_INICIAL = "safran2026";

const SOCIOS = [
  { nome: "Isabel Cristina", email: "isabel@safrancongelados.com.br" },
  { nome: "Victor Antonio", email: "victor@safrancongelados.com.br" },
  { nome: "Glaucos Antonio", email: "glaucos@safrancongelados.com.br" },
];

async function main() {
  for (const socio of SOCIOS) {
    const existente = await db.select().from(usuarios).where(eq(usuarios.email, socio.email)).limit(1);
    if (existente.length > 0) {
      console.log(`Já existe: ${socio.email}`);
      continue;
    }
    const senhaHash = await hashPassword(SENHA_INICIAL);
    await db.insert(usuarios).values({ nome: socio.nome, email: socio.email, senhaHash });
    console.log(`Criado: ${socio.email}`);
  }
  console.log(`\nSenha inicial para todos: ${SENHA_INICIAL}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
