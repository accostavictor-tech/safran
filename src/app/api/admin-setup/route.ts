import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios, insumos, insumoPrecoHistorico, receitas, receitaInsumos, pratos, pratoReceitas } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { MIGRATION_SQL } from "@/db/migration-sql";

// Rota temporária de configuração inicial da produção — schema + contas dos
// sócios + importação dos dados do Lovable. Protegida por token, feita para
// ser usada uma única vez e removida em seguida.

const SENHA_INICIAL = "safran2026";
const SOCIOS = [
  { nome: "Isabel Cristina", email: "isabel@safrancongelados.com.br" },
  { nome: "Victor Antonio", email: "victor@safrancongelados.com.br" },
  { nome: "Glaucos Antonio", email: "glaucos@safrancongelados.com.br" },
];

// Erros do Postgres que significam "já existe" — toleráveis para tornar a rota
// segura de rodar mais de uma vez (schema já criado, etc.).
const CODIGOS_JA_EXISTE = new Set(["42P07", "42710", "23505"]);

// Mesmo formato de $inferInsert, mas com datas como string (formato que
// chega de fato pelo JSON) — convertidas para Date antes de inserir.
type ComDatasString<T> = { [K in keyof T]: T[K] extends Date | undefined ? string : T[K] };

interface ImportPayload {
  insumos?: ComDatasString<typeof insumos.$inferInsert>[];
  insumoPrecoHistorico?: ComDatasString<typeof insumoPrecoHistorico.$inferInsert>[];
  receitas?: ComDatasString<typeof receitas.$inferInsert>[];
  receitaInsumos?: (typeof receitaInsumos.$inferInsert)[];
  pratos?: ComDatasString<typeof pratos.$inferInsert>[];
  pratoReceitas?: (typeof pratoReceitas.$inferInsert)[];
}

function revive<T extends Record<string, unknown>>(rows: T[] | undefined, campos: (keyof T)[]): T[] | undefined {
  return rows?.map((r) => {
    const copia = { ...r };
    for (const campo of campos) {
      if (typeof copia[campo] === "string") {
        copia[campo] = new Date(copia[campo] as string) as T[typeof campo];
      }
    }
    return copia;
  });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-setup-token");
  if (!token || token !== process.env.ADMIN_SETUP_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const log: string[] = [];
  const body = (await req.json().catch(() => ({}))) as {
    schema?: boolean;
    seed?: boolean;
    import?: ImportPayload;
  };

  try {
    if (body.schema) {
      const client = postgres(process.env.DATABASE_URL!);
      const statements = MIGRATION_SQL.split("--> statement-breakpoint")
        .map((s) => s.trim())
        .filter(Boolean);
      let ok = 0;
      for (const stmt of statements) {
        try {
          await client.unsafe(stmt);
          ok++;
        } catch (err: unknown) {
          const code = (err as { code?: string })?.code;
          if (code && CODIGOS_JA_EXISTE.has(code)) {
            log.push(`schema: ignorado (já existia) - ${stmt.slice(0, 50)}...`);
          } else {
            throw err;
          }
        }
      }
      await client.end();
      log.push(`schema: ${ok}/${statements.length} statements aplicados`);
    }

    if (body.seed) {
      let criados = 0;
      for (const socio of SOCIOS) {
        const existente = await db.select().from(usuarios).where(eq(usuarios.email, socio.email)).limit(1);
        if (existente.length > 0) continue;
        const senhaHash = await hashPassword(SENHA_INICIAL);
        await db.insert(usuarios).values({ nome: socio.nome, email: socio.email, senhaHash });
        criados++;
      }
      log.push(`seed: ${criados} conta(s) criada(s) (senha inicial: ${SENHA_INICIAL})`);
    }

    if (body.import) {
      const d = body.import;
      const insumosRev = revive(d.insumos, ["createdAt", "updatedAt"]);
      const insumoHistRev = revive(d.insumoPrecoHistorico, ["createdAt"]);
      const receitasRev = revive(d.receitas, ["createdAt", "updatedAt"]);
      const pratosRev = revive(d.pratos, ["createdAt", "updatedAt"]);

      if (insumosRev?.length) {
        await db.insert(insumos).values(insumosRev as (typeof insumos.$inferInsert)[]).onConflictDoNothing();
        log.push(`import: ${insumosRev.length} insumos`);
      }
      if (insumoHistRev?.length) {
        await db
          .insert(insumoPrecoHistorico)
          .values(insumoHistRev as (typeof insumoPrecoHistorico.$inferInsert)[])
          .onConflictDoNothing();
        log.push(`import: ${insumoHistRev.length} registros de histórico de preço`);
      }
      if (receitasRev?.length) {
        await db.insert(receitas).values(receitasRev as (typeof receitas.$inferInsert)[]).onConflictDoNothing();
        log.push(`import: ${receitasRev.length} receitas`);
      }
      if (d.receitaInsumos?.length) {
        await db.insert(receitaInsumos).values(d.receitaInsumos).onConflictDoNothing();
        log.push(`import: ${d.receitaInsumos.length} itens de receita`);
      }
      if (pratosRev?.length) {
        await db.insert(pratos).values(pratosRev as (typeof pratos.$inferInsert)[]).onConflictDoNothing();
        log.push(`import: ${pratosRev.length} pratos`);
      }
      if (d.pratoReceitas?.length) {
        await db.insert(pratoReceitas).values(d.pratoReceitas).onConflictDoNothing();
        log.push(`import: ${d.pratoReceitas.length} composições de prato`);
      }
    }

    return NextResponse.json({ ok: true, log });
  } catch (err) {
    return NextResponse.json({ ok: false, log, error: String(err) }, { status: 500 });
  }
}
