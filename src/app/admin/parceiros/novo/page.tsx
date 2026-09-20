import { PageHeader } from "@/components/page-header";
import { ParceiroForm } from "@/components/parceiro-form";

export default function NovoParceiroPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Novo parceiro" description="Empresa, afiliado ou nutricionista." />
      <ParceiroForm />
    </div>
  );
}
