import { PageHeader } from "@/components/page-header";
import { InsumoForm } from "@/components/insumo-form";

export default function NovoInsumoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Novo insumo" />
      <InsumoForm />
    </div>
  );
}
