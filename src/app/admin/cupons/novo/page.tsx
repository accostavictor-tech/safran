import { PageHeader } from "@/components/page-header";
import { CupomForm } from "@/components/cupom-form";

export default function NovoCupomPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Novo cupom" description="O código é o que o cliente digita no checkout." />
      <CupomForm />
    </div>
  );
}
