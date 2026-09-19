import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cupons } from "@/db/schema";
import { PageHeader } from "@/components/page-header";
import { CupomForm } from "@/components/cupom-form";

export default async function EditarCupomPage({ params }: PageProps<"/admin/cupons/[id]">) {
  const { id } = await params;
  const [cupom] = await db.select().from(cupons).where(eq(cupons.id, id)).limit(1);
  if (!cupom) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title={cupom.codigo} description={`Usado ${cupom.usos} ${cupom.usos === 1 ? "vez" : "vezes"}.`} />
      <CupomForm cupom={cupom} />
    </div>
  );
}
