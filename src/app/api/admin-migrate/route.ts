import { NextRequest, NextResponse } from "next/server";
import postgres from "postgres";
import { MIGRATION_SQL_0001 } from "@/db/migration-sql-0001";

// Rota temporária de uma única aplicação: adiciona a coluna "codigo" (INS-/REC-/PRT- sequencial)
// em insumos, receitas e pratos, preenchendo os registros existentes. Protegida por token,
// removida depois de usada.

const CODIGOS_JA_EXISTE = new Set(["42P07", "42701", "42710", "23505"]);

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-migrate-token");
  if (!token || token !== process.env.ADMIN_MIGRATE_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const client = postgres(process.env.DATABASE_URL!);
  const log: string[] = [];
  try {
    const statements = MIGRATION_SQL_0001.split("--> statement-breakpoint")
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
