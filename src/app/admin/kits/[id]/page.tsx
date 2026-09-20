import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { formatarCodigo } from "@/lib/calculations";
import { PageHeader } from "@/components/page-header";
import { KitForm } from "@/components/kit-form";

export const dynamic = "force-dynamic";

export default async function EditarKitPage({ params }: PageProps<"/admin/kits/[id]">) {
  const { id } = await params;
  const [kit] = await db.select().from(kits).where(eq(kits.id, id)).limit(1);
  if (!kit) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title={kit.nome} description={formatarCodigo("KIT", kit.codigo)} />
      <KitForm kit={kit} />
    </div>
  );
}
