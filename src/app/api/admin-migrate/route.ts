import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { MIGRATION_SQL_0001 } from "@/db/migration-sql-0001";
import { MIGRATION_SQL_0002 } from "@/db/migration-sql-0002";

// Rota temporária de uma única aplicação: aplica as migrations pendentes
// (0001: coluna "codigo" sequencial em insumos/receitas/pratos; 0002: fonte e data
// de revisão dos macronutrientes em insumos). Protegida por token, removida depois de usada.

const CODIGOS_JA_EXISTE = new Set(["42P07", "42701", "42710", "23505"]);

async function aplicar(client: postgres.Sql, sql: string, log: string[]) {
  const statements = sql
    .split("--> statement-breakpoint")
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
        log.push(`ignorado (já existia) - ${stmt.slice(0, 60)}...`);
      } else {
        throw err;
      }
    }
  }
  log.push(`${ok}/${statements.length} statements aplicados`);
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-migrate-token");
  if (!token || token !== process.env.ADMIN_MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = postgres(process.env.DATABASE_URL!);
  const log: string[] = [];
  try {
    await aplicar(client, MIGRATION_SQL_0001, log);
    await aplicar(client, MIGRATION_SQL_0002, log);

    const [insumos] = await client`select count(*)::int as n, min(codigo) as min, max(codigo) as max from insumos`;
    const [receitas] = await client`select count(*)::int as n, min(codigo) as min, max(codigo) as max from receitas`;
    const [pratos] = await client`select count(*)::int as n, min(codigo) as min, max(codigo) as max from pratos`;

    return NextResponse.json({ ok: true, log, contagens: { insumos, receitas, pratos } });
  } catch (err) {
    return NextResponse.json({ ok: false, log, error: String(err) }, { status: 500 });
  } finally {
    await client.end();
  }
}
