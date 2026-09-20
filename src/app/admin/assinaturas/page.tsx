import { CalendarClock } from "lucide-react";
import { listarAssinaturasPainel } from "@/db/queries/assinaturas";
import { formatarCentavos, formatarCodigo } from "@/lib/calculations";
import { formatarTelefone } from "@/lib/loja";
import { diasAte, FREQUENCIA_LABEL } from "@/lib/assinaturas";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { StatTile } from "@/components/stat-tile";
import { GerarPedidosButton } from "./gerar-button";

export const dynamic = "force-dynamic";

const DATA = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" });

const BADGE_STATUS = {
  ativa: "success",
  pausada: "warning",
  cancelada: "secondary",
} as const;

const LABEL_STATUS = {
  ativa: "Ativa",
  pausada: "Pausada",
  cancelada: "Cancelada",
} as const;

export default async function AssinaturasPage() {
  const linhas = await listarAssinaturasPainel();

  const ativas = linhas.filter((l) => l.assinatura.status === "ativa");
  const vencidas = ativas.filter((l) => diasAte(l.assinatura.proximaEntrega) <= 0);
  // Receita recorrente pelo preço-base do kit: os adicionais dependem da
  // composição de cada ciclo, então entram como variação, não como previsão.
  const recorrenteMensal = ativas.reduce((acc, l) => {
    const porMes = l.assinatura.frequencia === "semanal" ? 4 : l.assinatura.frequencia === "quinzenal" ? 2 : 1;
    return acc + l.kitPreco * porMes;
  }, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Assinaturas"
        description={`${ativas.length} ativa${ativas.length === 1 ? "" : "s"} de ${linhas.length}`}
        action={<GerarPedidosButton pendentes={vencidas.length} />}
      />

      {linhas.length > 0 ? (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon={CalendarClock} label="Assinaturas ativas" value={String(ativas.length)} />
          <StatTile
            icon={CalendarClock}
            label="Entregas vencidas"
            value={String(vencidas.length)}
            tone={vencidas.length > 0 ? "warning" : "default"}
          />
          <StatTile
            icon={CalendarClock}
            label="Recorrente no mês (base)"
            value={formatarCentavos(recorrenteMensal)}
          />
        </div>
      ) : null}

      {linhas.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhuma assinatura ainda"
          description="Quando um cliente assinar um kit, ele aparece aqui com a próxima entrega e a composição do ciclo."
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Kit</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Próxima entrega</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map(({ assinatura, clienteNome, clienteTelefone, kitNome, kitPreco, bairro }) => {
                const dias = diasAte(assinatura.proximaEntrega);
                const vencida = assinatura.status === "ativa" && dias <= 0;
                return (
                  <TableRow key={assinatura.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {formatarCodigo("PED", assinatura.codigo).replace("PED", "ASS")}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{clienteNome || "—"}</p>
                      <p className="text-xs text-muted-foreground">{formatarTelefone(clienteTelefone)}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kitNome}
                      <span className="block text-xs tabular-nums">{formatarCentavos(kitPreco)}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {FREQUENCIA_LABEL[assinatura.frequencia]}
                    </TableCell>
                    <TableCell className={vencida ? "font-medium text-on-warning-soft" : "text-muted-foreground"}>
                      {DATA.format(assinatura.proximaEntrega)}
                      <span className="block text-xs">
                        {dias <= 0 ? "vencida" : dias === 1 ? "amanhã" : `em ${dias} dias`}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{bairro ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={BADGE_STATUS[assinatura.status]}>{LABEL_STATUS[assinatura.status]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
